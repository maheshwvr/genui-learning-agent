/**
 * React hook for managing TUS uploads with state management
 * Provides upload progress tracking, queue management, and error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload } from 'tus-js-client'
import { uploadFileWithTus, validateFileForTusUpload, TusUploadOptions } from '@/lib/supabase/tus-upload'

export interface UploadQueueItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused'
  progress: number
  error?: string
  filePath?: string
  upload?: Upload
}

export interface UseTusUploadOptions {
  courseId: string
  existingFileNames?: string[]
  topicTags?: string[]
  onUploadComplete?: (filePath: string, file: File) => void
  onAllUploadsComplete?: () => void
  onError?: (error: string, file: File) => void
  sequential?: boolean // Whether to upload files one at a time
}

export interface UseTusUploadReturn {
  uploadQueue: UploadQueueItem[]
  isUploading: boolean
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  pauseUpload: (id: string) => void
  resumeUpload: (id: string) => void
  cancelUpload: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  totalProgress: number
  activeUploads: number
}

export function useTusUpload(options: UseTusUploadOptions): UseTusUploadReturn {
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const processingRef = useRef(false)
  const uploadsRef = useRef<Map<string, Upload>>(new Map())

  const {
    courseId,
    existingFileNames = [],
    topicTags = [],
    onUploadComplete,
    onAllUploadsComplete,
    onError,
    sequential = true
  } = options

  const isUploading = uploadQueue.some(item => item.status === 'uploading')
  const activeUploads = uploadQueue.filter(item => item.status === 'uploading').length

  // Calculate total progress across all uploads
  const totalProgress = uploadQueue.length > 0
    ? uploadQueue.reduce((sum, item) => sum + item.progress, 0) / uploadQueue.length
    : 0

  const updateQueueItem = useCallback((id: string, updates: Partial<UploadQueueItem>) => {
    setUploadQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  const processNextUpload = useCallback(async () => {
    if (processingRef.current) return
    
    setUploadQueue(currentQueue => {
      const nextItem = currentQueue.find(item => item.status === 'pending')
      if (!nextItem) {
        // Check if all uploads are complete
        const allComplete = currentQueue.length > 0 && 
          currentQueue.every(item => item.status === 'completed' || item.status === 'error')
        
        if (allComplete) {
          onAllUploadsComplete?.()
        }
        return currentQueue
      }

      processingRef.current = true
      
      // Process this item asynchronously
      const processItem = async () => {
        try {
          console.log('Processing upload for:', nextItem.file.name)
          
          // Validate file before upload
          const validation = validateFileForTusUpload(nextItem.file)
          if (!validation.valid) {
            console.error('File validation failed:', validation.error)
            updateQueueItem(nextItem.id, {
              status: 'error',
              error: validation.error
            })
            onError?.(validation.error || 'File validation failed', nextItem.file)
            processingRef.current = false
            setTimeout(processNextUpload, 100)
            return
          }

          console.log('Starting TUS upload for:', nextItem.file.name)

          // Start upload
          updateQueueItem(nextItem.id, { status: 'uploading' })

          const uploadOptions: TusUploadOptions = {
            file: nextItem.file,
            courseId,
            existingFileNames,
            topicTags,
            onProgress: (bytesUploaded: number, bytesTotal: number) => {
              const progress = Math.round((bytesUploaded / bytesTotal) * 100)
              updateQueueItem(nextItem.id, { progress })
            },
            onSuccess: (filePath: string) => {
              updateQueueItem(nextItem.id, {
                status: 'completed',
                progress: 100,
                filePath
              })
              uploadsRef.current.delete(nextItem.id)
              onUploadComplete?.(filePath, nextItem.file)
              processingRef.current = false
              
              // Continue with next upload if sequential
              if (sequential) {
                setTimeout(processNextUpload, 100)
              }
            },
            onError: (error: Error) => {
              updateQueueItem(nextItem.id, {
                status: 'error',
                error: error.message
              })
              uploadsRef.current.delete(nextItem.id)
              onError?.(error.message, nextItem.file)
              processingRef.current = false
              
              // Continue with next upload even if this one failed
              if (sequential) {
                setTimeout(processNextUpload, 100)
              }
            }
          }

          const result = await uploadFileWithTus(uploadOptions)
          
          if (!result.success) {
            updateQueueItem(nextItem.id, {
              status: 'error',
              error: result.error
            })
            onError?.(result.error || 'Upload failed', nextItem.file)
            processingRef.current = false
            
            if (sequential) {
              setTimeout(processNextUpload, 100)
            }
          }
        } catch (error) {
          console.error('Upload error:', error)
          updateQueueItem(nextItem.id, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          onError?.(error instanceof Error ? error.message : 'Unknown error', nextItem.file)
          processingRef.current = false
          
          if (sequential) {
            setTimeout(processNextUpload, 100)
          }
        }
      }

      processItem()
      return currentQueue
    })
  }, [courseId, existingFileNames, topicTags, onUploadComplete, onAllUploadsComplete, onError, sequential, updateQueueItem])

  // Use effect to process uploads when queue changes
  useEffect(() => {
    const hasPendingUploads = uploadQueue.some(item => item.status === 'pending')
    if (hasPendingUploads && !processingRef.current) {
      setTimeout(processNextUpload, 100)
    }
  }, [uploadQueue, processNextUpload])

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadQueueItem[] = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending' as const,
      progress: 0
    }))

    setUploadQueue(prev => [...prev, ...newItems])
  }, [])

  const removeFile = useCallback((id: string) => {
    // Cancel upload if in progress
    const upload = uploadsRef.current.get(id)
    if (upload) {
      upload.abort()
      uploadsRef.current.delete(id)
    }

    setUploadQueue(prev => prev.filter(item => item.id !== id))
  }, [])

  const pauseUpload = useCallback((id: string) => {
    const upload = uploadsRef.current.get(id)
    if (upload) {
      upload.abort()
      updateQueueItem(id, { status: 'paused' })
    }
  }, [updateQueueItem])

  const resumeUpload = useCallback((id: string) => {
    updateQueueItem(id, { status: 'pending' })
    setTimeout(processNextUpload, 100)
  }, [updateQueueItem, processNextUpload])

  const cancelUpload = useCallback((id: string) => {
    const upload = uploadsRef.current.get(id)
    if (upload) {
      upload.abort()
      uploadsRef.current.delete(id)
    }
    removeFile(id)
  }, [removeFile])

  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'error'
    ))
  }, [])

  const clearAll = useCallback(() => {
    // Cancel all active uploads
    uploadsRef.current.forEach(upload => upload.abort())
    uploadsRef.current.clear()
    setUploadQueue([])
    processingRef.current = false
  }, [])

  return {
    uploadQueue,
    isUploading,
    addFiles,
    removeFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    clearCompleted,
    clearAll,
    totalProgress,
    activeUploads
  }
}