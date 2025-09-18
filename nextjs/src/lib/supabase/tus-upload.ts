/**
 * TUS (resumable uploads) integration with Supabase Storage
 * Supports uploads up to 100MB with progress tracking and resumable uploads
 */

import { Upload } from 'tus-js-client'
import { createSPAClient } from './client'
import { sanitizeFileNameForStorage, generateUniqueFileName } from '@/lib/utils/file-utils'

export interface TusUploadOptions {
  file: File
  courseId: string
  existingFileNames?: string[]
  topicTags?: string[]
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void
  onError?: (error: Error) => void
  onSuccess?: (filePath: string) => void
  chunkSize?: number
}

export interface TusUploadResult {
  success: boolean
  filePath?: string
  error?: string
}

/**
 * Generate a unique file path for Supabase storage
 */
export function generateSupabaseFilePath(
  userId: string, 
  courseId: string, 
  fileName: string
): string {
  const sanitizedName = sanitizeFileNameForStorage(fileName)
  return `${userId}/${courseId}/${sanitizedName}`
}

/**
 * Get the TUS endpoint URL for Supabase storage
 */
export function getSupabaseTusEndpoint(bucketName: string = 'materials'): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }
  // Correct TUS endpoint for Supabase
  return `${supabaseUrl}/storage/v1/upload/resumable`
}

/**
 * Create a TUS upload instance with Supabase configuration
 */
export async function createTusUpload(options: TusUploadOptions): Promise<Upload> {
  const supabase = createSPAClient()
  
  // Get current session for auth headers
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new Error('Authentication required for file upload')
  }

  // Verify environment variables
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
  }

  console.log('Creating TUS upload for file:', options.file.name, 'Size:', options.file.size)

  const { file, courseId, existingFileNames = [] } = options
  
  // Generate unique filename to avoid collisions
  const uniqueFileName = generateUniqueFileName(file.name, existingFileNames)
  const filePath = generateSupabaseFilePath(session.user.id, courseId, uniqueFileName)

  console.log('Upload path:', filePath)
  console.log('TUS endpoint:', getSupabaseTusEndpoint('materials'))
  console.log('Session user ID:', session.user.id)
  console.log('Access token length:', session.access_token?.length || 0)

  // Create TUS upload instance
  const upload = new Upload(file, {
    endpoint: getSupabaseTusEndpoint('materials'),
    
    // Chunk size for optimal performance (6MB)
    chunkSize: options.chunkSize || 6 * 1024 * 1024,
    
    // Retry configuration
    retryDelays: [0, 3000, 5000, 10000, 20000],
    
    // Metadata for Supabase TUS upload
    metadata: {
      bucketName: 'materials',
      objectName: filePath,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
      filename: uniqueFileName
    },
    
    // Authentication headers for Supabase TUS
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
      'x-upsert': 'false'
    },
    
    // Progress callback
    onProgress: (bytesUploaded: number, bytesTotal: number) => {
      console.log(`Upload progress: ${bytesUploaded}/${bytesTotal} bytes`)
      options.onProgress?.(bytesUploaded, bytesTotal)
    },
    
    // Error handling
    onError: (error: Error) => {
      console.error('TUS upload error:', error)
      options.onError?.(error)
    },
    
    // Success callback
    onSuccess: () => {
      console.log('TUS upload completed successfully for:', file.name)
      options.onSuccess?.(filePath)
    },
    
    // Additional event handlers for debugging
    onChunkComplete: (chunkSize: number, bytesAccepted: number, bytesTotal: number) => {
      console.log(`Chunk completed: ${bytesAccepted}/${bytesTotal} bytes`)
    },
    
    onAfterResponse: (req: any, res: any) => {
      // Log response for debugging
      console.log('TUS response status:', res.status)
      if (res.status >= 400) {
        console.error('TUS upload response error:', {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
          url: req.url
        })
        try {
          const responseText = res.text || ''
          console.error('Response body:', responseText)
        } catch (e) {
          console.error('Could not read response body:', e)
        }
      }
    }
  })

  return upload
}

/**
 * Upload a file using TUS protocol with comprehensive error handling
 */
export async function uploadFileWithTus(options: TusUploadOptions): Promise<TusUploadResult> {
  try {
    const upload = await createTusUpload(options)
    
    // Check if this upload can be resumed
    const previousUploads = await upload.findPreviousUploads()
    if (previousUploads.length > 0) {
      upload.resumeFromPreviousUpload(previousUploads[0])
    }

    // Start the upload
    return new Promise((resolve) => {
      // Override success handler to resolve promise
      const originalOnSuccess = upload.options.onSuccess
      upload.options.onSuccess = () => {
        originalOnSuccess?.()
        resolve({
          success: true,
          filePath: generateSupabaseFilePath(
            '', // Will be filled by actual user ID
            options.courseId,
            generateUniqueFileName(options.file.name, options.existingFileNames || [])
          )
        })
      }

      // Override error handler to resolve promise
      const originalOnError = upload.options.onError
      upload.options.onError = (error: Error) => {
        originalOnError?.(error)
        resolve({
          success: false,
          error: error.message
        })
      }

      // Start upload
      upload.start()
    })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

/**
 * Validate file for TUS upload (100MB limit)
 */
export function validateFileForTusUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100MB
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 100MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    }
  }
  
  // Basic file type validation
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}`
    }
  }
  
  return { valid: true }
}

/**
 * Get upload resume information for a specific file
 */
export async function getUploadResumeInfo(file: File): Promise<boolean> {
  try {
    const upload = new Upload(file, { endpoint: getSupabaseTusEndpoint() })
    const previousUploads = await upload.findPreviousUploads()
    return previousUploads.length > 0
  } catch {
    return false
  }
}

/**
 * Clear all stored upload resume data (useful for cleanup)
 */
export function clearUploadResumeData(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('tus::')) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    console.warn('Failed to clear upload resume data:', error)
  }
}