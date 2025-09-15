'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { Upload, FileIcon, X } from 'lucide-react'
import { validateFileType, formatFileSize } from '@/lib/utils/file-utils'

interface DroppedFile {
  file: File
  id: string
  preview?: string
}

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
}

export function DragDropZone({
  onFilesDropped,
  disabled = false,
  className = '',
  children,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true
}: DragDropZoneProps) {
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      console.warn('Some files were rejected:', rejectedFiles)
    }

    if (acceptedFiles.length > 0) {
      // Create preview objects for dropped files
      const filesWithPreviews = acceptedFiles.map(file => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      }))

      setDroppedFiles(prev => [...prev, ...filesWithPreviews])
      
      // Call the parent handler
      onFilesDropped(acceptedFiles)
    }
  }, [onFilesDropped])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    accept,
    maxSize,
    multiple,
    noClick: true, // Disable click to open file dialog
    noKeyboard: true // Disable keyboard activation
  })

  const removeFile = (fileId: string) => {
    setDroppedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      // Revoke object URLs to prevent memory leaks
      const removed = prev.find(f => f.id === fileId)
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }

  const clearAllFiles = () => {
    droppedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setDroppedFiles([])
  }

  return (
    <div className={cn("relative", className)}>
      {/* Drag and drop overlay */}
      <div
        {...getRootProps()}
        className={cn(
          "relative transition-all duration-200 ease-in-out",
          "border-2 border-dashed border-transparent rounded-lg",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          isDragAccept && "border-green-500 bg-green-50",
          !isDragActive && droppedFiles.length === 0 && "hover:border-muted-foreground/20 hover:bg-muted/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {/* Drop zone overlay when dragging */}
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg z-20">
            <div className="text-center p-6">
              <Upload className={cn(
                "h-12 w-12 mx-auto mb-3",
                isDragAccept && "text-green-500",
                isDragReject && "text-destructive",
                !isDragReject && !isDragAccept && "text-primary"
              )} />
              <p className="text-lg font-medium">
                {isDragReject 
                  ? "Some files are not supported" 
                  : "Drop files here to upload"
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isDragReject 
                  ? "Please check file types and sizes"
                  : `Maximum ${formatFileSize(maxSize)} per file`
                }
              </p>
            </div>
          </div>
        )}

        {/* Subtle hint when not dragging and no files */}
        {!isDragActive && droppedFiles.length === 0 && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border">
              <Upload className="h-3 w-3" />
              <span>Drag & drop files here</span>
            </div>
          </div>
        )}

        {/* Content (existing materials) */}
        <div className="min-h-[200px]">
          {children}
        </div>

        {/* Dropped files preview */}
        {droppedFiles.length > 0 && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Ready to upload ({droppedFiles.length} files)</h4>
              <button
                onClick={clearAllFiles}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {droppedFiles.map((droppedFile) => (
                <div
                  key={droppedFile.id}
                  className="flex items-center space-x-3 p-2 bg-background rounded border"
                >
                  {droppedFile.preview ? (
                    <img
                      src={droppedFile.preview}
                      alt={droppedFile.file.name}
                      className="h-8 w-8 object-cover rounded"
                    />
                  ) : (
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{droppedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(droppedFile.file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(droppedFile.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}