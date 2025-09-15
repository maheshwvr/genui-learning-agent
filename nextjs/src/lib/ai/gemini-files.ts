import { google } from '@ai-sdk/google'
import { getSignedMaterialUrl } from '@/lib/supabase/materials'

export interface ProcessedMaterial {
  id: string
  name: string
  uri?: string
  mimeType: string
  error?: string
}

export interface MaterialProcessingResult {
  processedMaterials: ProcessedMaterial[]
  materialFileData: Array<{ fileUri: string; mimeType: string }>
  systemPromptAddition: string
}

// Supported file types for Gemini file upload
const SUPPORTED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/plain',
  'application/vnd.hancom.hwp',
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  'application/x-hwp',
  
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/tab-separated-values',
  
  // Presentations
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heif',
  'image/svg+xml',
  
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'audio/aiff',
  'audio/ogg',
  'audio/mpa',
  'audio/opus',
  'audio/mp4',
  'audio/x-m4a',
  'audio/x-mpegurl',
  'audio/pcm',
  
  // Video
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/mpeg',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/3gpp',
  'video/x-flv',
  
  // Code
  'text/x-python',
  'application/javascript',
  'text/javascript',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/html',
  
  // Archives
  'application/zip'
])

export function isFileTypeSupported(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase())
}

export async function processLessonMaterials(
  materials: any[]
): Promise<MaterialProcessingResult> {
  const processedMaterials: ProcessedMaterial[] = []
  const materialFileData: Array<{ fileUri: string; mimeType: string }> = []
  
  console.log(`Processing ${materials.length} materials for lesson context...`)

  for (const material of materials) {
    try {
      // Check if file type is supported
      if (!isFileTypeSupported(material.mime_type)) {
        processedMaterials.push({
          id: material.id,
          name: material.file_name,
          mimeType: material.mime_type,
          error: `File type ${material.mime_type} not supported for AI processing`
        })
        continue
      }

      // Get signed URL for the file
      const signedUrl = await getSignedMaterialUrl(material.file_path)
      if (!signedUrl) {
        processedMaterials.push({
          id: material.id,
          name: material.file_name,
          mimeType: material.mime_type,
          error: 'Failed to get file access URL'
        })
        continue
      }

      // For now, we'll use the signed URL directly as the file URI
      // The AI SDK can handle remote URLs for file processing
      materialFileData.push({
        fileUri: signedUrl,
        mimeType: material.mime_type
      })

      processedMaterials.push({
        id: material.id,
        name: material.file_name,
        uri: signedUrl,
        mimeType: material.mime_type
      })

      console.log(`Successfully processed material: ${material.file_name}`)
    } catch (error) {
      console.error(`Error processing material ${material.file_name}:`, error)
      processedMaterials.push({
        id: material.id,
        name: material.file_name,
        mimeType: material.mime_type,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Generate system prompt addition based on processed materials
  const successfulMaterials = processedMaterials.filter(m => !m.error)
  const failedMaterials = processedMaterials.filter(m => m.error)

  let systemPromptAddition = ''
  
  if (successfulMaterials.length > 0) {
    systemPromptAddition += `\n\nCONTEXT MATERIALS:\n`
    systemPromptAddition += `You have access to ${successfulMaterials.length} course materials that the user has uploaded:\n`
    successfulMaterials.forEach(material => {
      systemPromptAddition += `- ${material.name} (${material.mimeType})\n`
    })
    systemPromptAddition += `\nUse these materials as the primary source for your responses. When answering questions, refer to specific content from these materials when relevant. If the user asks about concepts covered in the materials, draw your responses from this content rather than general knowledge.\n`
  }

  if (failedMaterials.length > 0) {
    systemPromptAddition += `\nNote: ${failedMaterials.length} materials could not be processed:\n`
    failedMaterials.forEach(material => {
      systemPromptAddition += `- ${material.name}: ${material.error}\n`
    })
  }

  console.log(`Material processing complete: ${successfulMaterials.length} successful, ${failedMaterials.length} failed`)

  return {
    processedMaterials,
    materialFileData,
    systemPromptAddition
  }
}

export async function getFileUploadMetadata(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    supported: isFileTypeSupported(file.type),
    lastModified: new Date(file.lastModified).toISOString()
  }
}