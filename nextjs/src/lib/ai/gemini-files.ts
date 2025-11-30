import { google } from '@ai-sdk/google'
import { getSignedMaterialUrl, updateMaterialGoogleUri } from '@/lib/supabase/materials'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleGenAI } from '@google/genai'

export interface ProcessedMaterial {
  id: string
  name: string
  uri?: string
  mimeType: string
  error?: string
  fileSize?: number
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

// Helper function to create multipart body for Google File API upload
async function createMultipartBody(fileBuffer: ArrayBuffer, fileName: string, mimeType: string): Promise<Blob> {
  const boundary = '----formdata-' + Math.random().toString(36);
  
  const textEncoder = new TextEncoder();
  const parts: BlobPart[] = [];

  // Add metadata part
  parts.push(textEncoder.encode(`--${boundary}\r\n`));
  parts.push(textEncoder.encode('Content-Disposition: form-data; name="metadata"\r\n'));
  parts.push(textEncoder.encode('Content-Type: application/json; charset=UTF-8\r\n\r\n'));
  parts.push(textEncoder.encode(JSON.stringify({
    file: {
      displayName: fileName
    }
  })));
  parts.push(textEncoder.encode('\r\n'));

  // Add file data part
  parts.push(textEncoder.encode(`--${boundary}\r\n`));
  parts.push(textEncoder.encode(`Content-Disposition: form-data; name="data"\r\n`));
  parts.push(textEncoder.encode(`Content-Type: ${mimeType}\r\n\r\n`));
  parts.push(fileBuffer);
  parts.push(textEncoder.encode('\r\n'));

  // End boundary
  parts.push(textEncoder.encode(`--${boundary}--\r\n`));

  return new Blob(parts, { type: `multipart/related; boundary=${boundary}` });
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

// Enhanced function that uploads files directly to Google's servers for proper document context
export async function processLessonMaterialsWithUpload(
  materials: any[]
): Promise<MaterialProcessingResult> {
  const processedMaterials: ProcessedMaterial[] = []
  const materialFileData: Array<{ fileUri: string; mimeType: string }> = []
  
  console.log(`Processing ${materials.length} materials with Google File Upload...`)

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Google Generative AI API key');
  }

  // Use GoogleGenAI client for file uploads
  const ai = new GoogleGenAI({ apiKey });

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

      // Check if we already have a cached Google file URI
      if (material.google_file_uri && material.google_file_uri.trim()) {
        console.log(`Using cached Google file URI for ${material.file_name}: ${material.google_file_uri}`);
        
        try {
          // Validate that the cached URI is still accessible by attempting to get file info
          // Extract the file name from the Google URI (format: https://generativelanguage.googleapis.com/v1beta/files/{file_id})
          const fileId = material.google_file_uri.split('/').pop() || '';
          
          if (!fileId) {
            throw new Error('Invalid Google file URI format');
          }
          
          const cachedFile = await ai.files.get({ name: fileId });
          
          if (cachedFile && (cachedFile.state === 'ACTIVE' || cachedFile.state === 'PROCESSING')) {
            // Cached URI is still valid, use it
            materialFileData.push({
              fileUri: material.google_file_uri,
              mimeType: material.mime_type
            });

            processedMaterials.push({
              id: material.id,
              name: material.file_name,
              uri: material.google_file_uri,
              mimeType: material.mime_type,
              fileSize: material.file_size
            });

            console.log(`Successfully processed cached material: ${material.file_name}`);
            continue;
          } else {
            throw new Error(`File state is ${cachedFile?.state || 'unknown'}, not accessible`);
          }
        } catch (validationError: any) {
          // If validation fails (403, 404, etc.), clear the cached URI and proceed to re-upload
          console.log(`Cached Google file URI for ${material.file_name} is no longer valid (${validationError.message}), clearing cache and re-uploading...`);
          
          try {
            // Clear the invalid cached URI from database
            await updateMaterialGoogleUri(material.id, '');
            console.log(`Cleared invalid cached URI for ${material.file_name}`);
          } catch (clearError) {
            console.warn(`Failed to clear invalid cached URI for ${material.file_name}:`, clearError);
          }
        }
      }

      // No cached URI, need to upload to Google
      console.log(`No cached URI found for ${material.file_name}, proceeding with upload...`);

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

      try {
        // Fetch the file content from the signed URL
        const response = await fetch(signedUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`Fetched ${material.file_name} (${arrayBuffer.byteLength} bytes), uploading to Google...`);

        // Convert ArrayBuffer to Blob for upload
        const fileBlob = new Blob([arrayBuffer], { type: material.mime_type });
        
        // Upload file using GoogleGenAI client
        const file = await ai.files.upload({
          file: fileBlob,
          config: {
            displayName: material.file_name,
            mimeType: material.mime_type
          },
        });

        console.log(`File uploaded. Name: ${file.name}, URI: ${file.uri}, State: ${file.state}`);

        if (!file.name) {
          throw new Error('No file name returned from Google upload');
        }

        // Wait for the file to be processed
        let getFile = await ai.files.get({ name: file.name });
        let attempts = 0;
        const maxAttempts = 60;
        
        while (getFile.state === 'PROCESSING' && attempts < maxAttempts) {
          console.log(`File ${material.file_name} is still processing (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
          getFile = await ai.files.get({ name: file.name });
          attempts++;
        }

        if (getFile.state === 'FAILED') {
          throw new Error(`File processing failed for ${material.file_name}`);
        }

        if (getFile.state === 'PROCESSING') {
          console.warn(`File ${material.file_name} is still processing after ${maxAttempts} attempts, proceeding anyway`);
        }

        if (!file.uri) {
          throw new Error('No file URI returned from Google upload');
        }

        const fileUri = file.uri;
        console.log(`Successfully uploaded ${material.file_name} to Google. URI: ${fileUri}`);

        // Cache the Google file URI in the database for future use
        try {
          await updateMaterialGoogleUri(material.id, fileUri);
          console.log(`Cached Google file URI for ${material.file_name}`);
        } catch (cacheError) {
          console.warn(`Failed to cache Google file URI for ${material.file_name}:`, cacheError);
          // Continue anyway - the upload was successful
        }

        // Store the Google file URI for use in chat
        materialFileData.push({
          fileUri: fileUri,
          mimeType: material.mime_type
        });

        processedMaterials.push({
          id: material.id,
          name: material.file_name,
          uri: fileUri,
          mimeType: material.mime_type,
          fileSize: arrayBuffer.byteLength
        });

        console.log(`Successfully processed material: ${material.file_name}`);
      } catch (uploadError) {
        console.error(`Error uploading material ${material.file_name}:`, uploadError);
        
        // Fall back to signed URL approach if upload fails
        console.log(`Falling back to signed URL for ${material.file_name}`);
        materialFileData.push({
          fileUri: signedUrl,
          mimeType: material.mime_type
        });

        processedMaterials.push({
          id: material.id,
          name: material.file_name,
          uri: signedUrl,
          mimeType: material.mime_type,
          error: `Upload failed, using fallback: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        });
      }
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
    systemPromptAddition += `You have access to ${successfulMaterials.length} course materials that have been uploaded and are available for analysis:\n`
    successfulMaterials.forEach(material => {
      const sizeInfo = material.fileSize ? ` (${(material.fileSize / 1024).toFixed(1)} KB)` : '';
      systemPromptAddition += `- ${material.name} (${material.mimeType})${sizeInfo}\n`
    })
    systemPromptAddition += `\nThese materials contain the course content for this lesson. Use them as the primary source for your responses. When answering questions, refer to specific content from these materials. Draw your responses from this content rather than general knowledge when the topics are covered in the materials.\n`
  }

  if (failedMaterials.length > 0) {
    systemPromptAddition += `\nNote: ${failedMaterials.length} materials could not be processed:\n`
    failedMaterials.forEach(material => {
      systemPromptAddition += `- ${material.name}: ${material.error}\n`
    })
  }

  console.log(`Enhanced material processing complete: ${successfulMaterials.length} successful, ${failedMaterials.length} failed`)

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