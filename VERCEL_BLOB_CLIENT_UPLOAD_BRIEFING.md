# Client Side to Supabase TUS Client-Side Upload Migration Briefing

## Project Overview

This briefing document outlines the implementation strategy for migrating from server-side file uploads (limited by Vercel's 4.5MB constraint) to a robust client-side upload solution using Supabase TUS (resumable uploads) protocol. The goal is to support files up to 100MB while maintaining security, user experience, and system reliability.

## Architecture Summary

The system will transition from server-side FormData uploads to direct client-side uploads using the TUS protocol:

```
Current Architecture (Server-Side):
Client → FormData → Next.js API Route → Supabase Storage → Database Record

New Architecture (Client-Side TUS):
Client → TUS Upload → Supabase Storage → Database Record
       ↓
   Progress Tracking & Auth
```

### Core Technology Stack
- **TUS Client**: `tus-js-client` for resumable uploads
- **Storage**: Supabase Storage with TUS endpoint
- **Authentication**: Existing Supabase auth integration
- **Progress Tracking**: Real-time upload progress with resume capability
- **File Limit**: 100MB maximum file size
- **Upload Strategy**: Sequential file processing

## Essential Files Analysis

### 1. **Primary Application Files**

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\app\storage\page.tsx`
- **Current Role**: Main Materials management page with server-side upload logic
- **Required Changes**: 
  - Replace `handleFileUpload` FormData approach with TUS client calls
  - Integrate upload progress tracking
  - Add sequential upload queue management
  - Maintain existing drag & drop integration
- **Key Functions to Modify**:
  - `handleFileUpload()` - Replace with TUS upload logic
  - `loadCourseMaterials()` - Preserve existing functionality
  - Add progress state management hooks

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\components\ui\drag-drop-zone.tsx`
- **Current Role**: Drag & drop file interface component
- **Required Changes**:
  - Integrate with new TUS upload hook
  - Add upload progress visualization
  - Enhance file validation for 100MB limit
  - Update file size display and validation messages
- **Integration Points**: 
  - Connect to `use-tus-upload` hook
  - Pass upload progress to progress component

### 2. **Storage and Backend Integration**

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\supabase\materials.ts`
- **Current Role**: Server-side material management functions
- **Required Changes**:
  - Remove or deprecate `uploadMaterialFile()` function
  - Keep database operations: `addMaterial()`, `deleteMaterialWithFile()`
  - Add TUS upload completion handler
  - Maintain existing signed URL and metadata functions
- **Functions to Preserve**:
  - `getCourseMaterials()`, `addMaterial()`, `deleteMaterialWithFile()`
  - `getSignedMaterialUrl()`, `getCourseTopics()`

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\api\courses\[id]\materials\route.ts`
- **Current Role**: API endpoint for server-side file upload and processing
- **Required Changes**:
  - **Remove**: POST handler for file uploads (lines 44-133)
  - **Preserve**: GET handler for fetching materials (lines 9-42)
  - **Preserve**: DELETE handler for material deletion (lines 135-179)
  - **Add**: POST handler for database record creation after TUS upload

### 3. **New Implementation Files**

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\supabase\tus-upload.ts` (New File)
- **Purpose**: Core TUS upload functionality with Supabase integration
- **Key Functions**:
  - `createTusUpload()` - Initialize TUS upload with auth headers
  - `uploadFileWithTus()` - Main upload function with progress callbacks
  - `generateSupabaseFilePath()` - Create user/course-specific paths
  - `getSupabaseTusEndpoint()` - Configure TUS endpoint with auth
- **Integration**: Uses existing Supabase client and auth system

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\hooks\use-tus-upload.ts` (New File)
- **Purpose**: React hook for managing TUS uploads with state
- **Features**:
  - Upload progress tracking (0-100%)
  - Error handling and retry logic
  - Sequential upload queue management
  - Upload pause/resume capabilities
- **State Management**: Upload status, progress, error states, queue position

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\components\ui\upload-progress.tsx` (New File)
- **Purpose**: Visual progress indicator for ongoing uploads
- **Features**:
  - Progress bar with percentage
  - File name and size display
  - Pause/resume controls
  - Cancel upload option
  - Queue position indicator for multiple files

### 4. **Utility and Configuration Files**

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\utils\file-utils.ts`
- **Current Role**: File validation and name sanitization utilities
- **Required Changes**:
  - Update `validateFileType()` to support 100MB limit
  - Add TUS-specific file validation
  - Enhance `formatFileSize()` for larger files
  - Add MIME type validation for TUS uploads
- **New Functions**: 
  - `validateFileForTusUpload()` - TUS-specific validation
  - `createFileChunks()` - For progress tracking

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\supabase\client.ts`
- **Current Role**: Supabase client configuration
- **Required Changes**:
  - Add TUS-specific client configuration
  - Ensure auth token access for TUS uploads
  - Add storage bucket configuration
- **Integration**: Provide auth headers for TUS uploads

#### `c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\package.json`
- **Required Changes**: Add `tus-js-client` dependency
- **Version**: Latest stable version (^3.0.0+)

## Detailed Architecture Connections

### Client-Side Upload Flow

```typescript
// Complete TUS upload to database flow
1. User selects/drops files
   ↓ File validation (100MB limit, MIME types)
   
2. Sequential upload queue creation
   ↓ For each file: sanitizeFileName(), generateUniqueFileName()
   
3. TUS upload initialization
   ↓ createTusUpload() with Supabase auth headers
   
4. Upload with progress tracking
   ↓ Real-time progress updates, pause/resume capability
   
5. Upload completion
   ↓ Database record creation via API
   
6. UI update
   ↓ Refresh materials list, clear upload queue
```

### Authentication Integration

```typescript
// TUS upload with Supabase auth
const { data: { session } } = await supabase.auth.getSession()
const upload = new tus.Upload(file, {
  endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/s3/${bucketName}`,
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'x-upsert': 'false'
  },
  metadata: {
    bucketName: 'materials',
    objectName: filePath,
    contentType: file.type
  }
})
```

### Data Model Preservation

The existing database schema remains unchanged:
- **materials table**: Same structure with file_path, file_size, etc.
- **Storage paths**: Maintain `user_id/course_id/filename` structure
- **Topic tags**: Preserve existing topic association functionality
- **Permissions**: Use existing RLS policies

## Implementation Strategy

### Phase 1: TUS Infrastructure Setup (Week 1)
1. **Add TUS dependency** and configure Supabase TUS endpoint
2. **Create core TUS upload utilities** with auth integration
3. **Build React hook** for upload state management
4. **Implement progress component** with visual feedback
5. **Test basic TUS upload** with small files

### Phase 2: Materials Page Integration (Week 2)
1. **Replace server-side upload logic** in Materials page
2. **Integrate TUS upload hook** with existing UI components
3. **Update drag & drop component** for TUS uploads
4. **Add sequential upload queue** management
5. **Test complete upload workflow** with 100MB files

### Phase 3: API Cleanup and Enhancement (Week 3)
1. **Remove server-side upload endpoints** from materials API
2. **Add database record creation** after TUS upload completion
3. **Enhance error handling** and retry mechanisms
4. **Add upload analytics** and performance monitoring
5. **Complete end-to-end testing** and performance validation

## Security and Performance Considerations

### Upload Security
- **Authentication**: TUS uploads use Supabase auth tokens
- **File validation**: Client-side validation plus server-side verification
- **Storage policies**: Maintain existing RLS policies for materials bucket
- **MIME type verification**: Validate file types before and after upload

### Performance Optimization
- **Sequential uploads**: Prevent bandwidth saturation and UI blocking
- **Progress tracking**: Real-time feedback with chunk-level progress
- **Resumable uploads**: Handle network interruptions gracefully
- **Memory management**: Stream file uploads without full memory loading

### Error Handling
- **Network failures**: Automatic retry with exponential backoff
- **Authentication expiry**: Token refresh handling during long uploads
- **File size validation**: Pre-upload validation and post-upload verification
- **Storage quota**: Handle Supabase storage limits gracefully

## Success Criteria

1. ✅ **Large file support**: Files up to 100MB upload successfully
2. ✅ **Upload progress**: Real-time progress tracking with pause/resume
3. ✅ **Sequential processing**: Multiple files upload one after another
4. ✅ **Resumable uploads**: Network interruptions don't require restart
5. ✅ **Auth integration**: Uses existing Supabase authentication
6. ✅ **UI consistency**: Maintains current Materials page design
7. ✅ **Performance**: No UI blocking during large file uploads
8. ✅ **Error recovery**: Graceful handling of upload failures
9. ✅ **Compatibility**: Works across modern browsers
10. ✅ **Data integrity**: All existing functionality preserved

## Migration Risks and Mitigation

### Risk: Browser Compatibility
- **Mitigation**: TUS protocol has broad browser support; implement feature detection

### Risk: Authentication Token Expiry
- **Mitigation**: Implement token refresh during long uploads

### Risk: Network Reliability
- **Mitigation**: TUS protocol inherently handles network interruptions

### Risk: Storage Costs
- **Mitigation**: 100MB limit prevents abuse; monitor usage patterns

### Risk: User Experience Disruption
- **Mitigation**: Maintain identical UI/UX; add progressive enhancements

## Technical Implementation Notes

### Key Dependencies
```json
{
  "tus-js-client": "^3.0.0"
}
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### TUS Configuration
- **Endpoint**: `{SUPABASE_URL}/storage/v1/s3/materials`
- **Chunk Size**: 6MB (optimal for web uploads)
- **Retry Attempts**: 3 with exponential backoff
- **Resume Support**: Enabled by default

This migration eliminates Vercel's 4.5MB upload limitation while providing a more robust, user-friendly upload experience with progress tracking and resumable uploads. The implementation maintains all existing functionality while significantly improving file upload capabilities.