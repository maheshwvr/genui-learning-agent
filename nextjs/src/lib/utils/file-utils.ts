/**
 * File processing utilities for the Materials page
 * Handles file name sanitization and validation
 */

import path from 'path'

/**
 * Sanitizes a filename by replacing spaces with underscores (only during upload)
 * Used for storage while preserving original display name
 */
export function sanitizeFileNameForStorage(filename: string): string {
  // Replace spaces with underscores
  const nameWithUnderscores = filename.replace(/\s+/g, '_')
  
  // Remove any other problematic characters for file systems
  const sanitized = nameWithUnderscores.replace(/[<>:"/\\|?*]/g, '_')
  
  // Ensure no multiple consecutive underscores
  return sanitized.replace(/_+/g, '_')
}

/**
 * Generates a unique filename to avoid collisions in storage
 */
export function generateUniqueFileName(originalName: string, existingNames: string[]): string {
  const sanitized = sanitizeFileNameForStorage(originalName)
  
  if (!existingNames.includes(sanitized)) {
    return sanitized
  }
  
  const { name, ext } = path.parse(sanitized)
  let counter = 1
  let uniqueName: string
  
  do {
    uniqueName = `${name}_${counter}${ext}`
    counter++
  } while (existingNames.includes(uniqueName))
  
  return uniqueName
}

/**
 * Validates file type against supported formats
 */
export function validateFileType(file: File, supportedTypes?: string[]): boolean {
  if (!supportedTypes) {
    // Default supported types from the existing system
    const defaultSupportedTypes = [
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
    return defaultSupportedTypes.includes(file.type)
  }
  
  return supportedTypes.includes(file.type)
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Extracts file extension from filename
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase()
}

/**
 * Gets MIME type icon name for display
 */
export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('pdf')) return 'file-text'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) return 'table'
  if (mimeType.includes('presentation')) return 'presentation'
  if (mimeType.startsWith('text/')) return 'file-text'
  return 'file'
}