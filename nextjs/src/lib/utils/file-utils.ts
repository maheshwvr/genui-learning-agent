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
 * Enhanced file validation for TUS uploads with 100MB limit
 */
export function validateFileForTusUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100MB
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 100MB limit. Current size: ${formatFileSize(file.size)}`
    }
  }
  
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    }
  }
  
  // Validate file type
  if (!validateFileType(file)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type || 'unknown'}`
    }
  }
  
  // Check for potentially problematic filenames
  const problematicChars = /[<>:"/\\|?*\x00-\x1f]/g
  if (problematicChars.test(file.name)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters'
    }
  }
  
  // Check filename length (most filesystems have 255 character limit)
  if (file.name.length > 200) {
    return {
      valid: false,
      error: 'Filename is too long (max 200 characters)'
    }
  }
  
  return { valid: true }
}

/**
 * Formats file size for display (enhanced for larger files)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  const value = bytes / Math.pow(k, i)
  const decimals = i === 0 ? 0 : value >= 100 ? 1 : 2
  
  return parseFloat(value.toFixed(decimals)) + ' ' + sizes[i]
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

/**
 * Create file chunks for progress tracking (used internally)
 */
export function createFileChunks(file: File, chunkSize: number = 6 * 1024 * 1024): Blob[] {
  const chunks: Blob[] = []
  let start = 0
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size)
    chunks.push(file.slice(start, end))
    start = end
  }
  
  return chunks
}

/**
 * Get human-readable file type name
 */
export function getFileTypeName(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/rtf': 'Rich Text Document',
    'text/plain': 'Text File',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'text/csv': 'CSV File',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image'
  }
  
  return typeMap[mimeType] || 'Unknown File Type'
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if file is a document
 */
export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/plain'
  ]
  return documentTypes.includes(file.type)
}