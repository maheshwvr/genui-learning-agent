# Materials-Courses-Learn Integration Implementation Briefing

## Project Overview

This briefing document outlines the implementation strategy for linking the Materials section with the Learn section through a course-based organization system. The goal is to center lessons around specific lecture/study materials, enabling users to organize their learning materials under courses and optionally categorize them by topics for focused learning sessions.

## Architecture Summary

The system follows a hierarchical structure where materials are organized under courses, optionally tagged with topics, and then linked to specific lessons for focused AI-assisted learning.

```
Users
├── Courses (New)
│   ├── Materials (Extended from existing storage)
│   │   └── Optional Topic Tags
│   └── Lessons (Existing, enhanced with course/topic linking)
```

## Task Goal

Implement a comprehensive materials-courses-lessons integration that:

1. **Extends existing storage system** to support course-based organization
2. **Enables course management** through the Materials tab with create/delete functionality
3. **Supports optional topic tagging** for granular material organization
4. **Integrates lesson creation** with course and topic selection
5. **Processes materials for AI context** using Gemini file upload at lesson creation
6. **Maintains existing functionality** while adding new organizational capabilities

## Current System Analysis

### Existing Components
- **Storage System**: File upload/download via Supabase storage (`/app/storage`)
- **Lessons System**: Chat sessions with persistence (`/app/learn/[lessonId]`)
- **AI Integration**: Gemini-powered chat with MCQ/TF generation
- **Database**: Supabase with existing `lessons` table containing `course_id` field

### Current Limitations
- Materials are stored without organizational structure
- No connection between stored materials and lessons
- Lessons lack contextual materials for AI processing
- No course-based learning workflows

## Essential Files to Modify/Create

### Database Schema (Migration Files)

#### 1. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\supabase\migrations\20250915000002_create_courses_materials_tables.sql`**
- **Purpose**: Create courses table and extend materials management
- **Tables**: 
  - `courses` - Course management with user ownership
  - `materials` - Extended file metadata with course/topic links
- **Relationships**: Foreign keys linking courses to users, materials to courses
- **RLS Policies**: User-based data isolation

### API Implementation (Route Files)

#### 2. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\api\courses\route.ts`**
- **Purpose**: CRUD operations for courses
- **Methods**: GET (user courses), POST (create course), DELETE (delete course)
- **Integration**: Links with materials and lessons

#### 3. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\api\courses\[id]\materials\route.ts`**
- **Purpose**: Materials management within courses
- **Methods**: GET (course materials), POST (add material), DELETE (remove material)
- **Features**: Topic tagging, file processing

#### 4. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\api\lessons\route.ts`** (Modified)
- **Purpose**: Enhanced lesson creation with course/topic context
- **Features**: Materials processing for AI context
- **Integration**: Links lessons to courses and topics

#### 5. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\api\chat\route.ts`** (Modified)
- **Purpose**: Enhanced AI chat with materials context
- **Features**: Gemini file upload integration for lesson materials
- **Processing**: Real-time material processing for AI context

### Frontend Components (UI Files)

#### 6. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\app\storage\page.tsx`** (Modified)
- **Purpose**: Course-based materials management interface
- **Features**: Course creation, material upload, topic tagging, deletion workflows
- **UI**: Card-based course display, drag-drop uploads

#### 7. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\app\learn\page.tsx`** (Modified)
- **Purpose**: Course and topic selection for lesson creation
- **Features**: Course cards display, topic multi-select, lesson initiation
- **Flow**: Course selection → Topic selection → Lesson creation

#### 8. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\app\app\learn\[lessonId]\page.tsx`** (Modified)
- **Purpose**: Enhanced lesson interface with materials context
- **Features**: Materials-aware chat, contextual AI responses
- **Integration**: Course materials processing for AI context

#### 9. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\components\ui\course-selector.tsx`** (New)
- **Purpose**: Reusable course selection component
- **Features**: Course cards, search/filter, creation workflow
- **Usage**: Used in both Materials and Learn sections

#### 10. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\components\ui\topic-selector.tsx`** (New)
- **Purpose**: Topic selection component for lessons
- **Features**: Multi-select topics, "Select All" option
- **Integration**: Used in lesson creation flow

### Database Operations (Utility Files)

#### 11. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\supabase\courses.ts`** (New)
- **Purpose**: Course-specific database operations
- **Functions**: createCourse, getCourse, getUserCourses, deleteCourse
- **Type Safety**: Typed Supabase operations with proper error handling

#### 12. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\supabase\materials.ts`** (New)
- **Purpose**: Materials management database operations
- **Functions**: addMaterial, getMaterials, updateMaterial, deleteMaterial
- **Features**: Topic tagging, file metadata management

#### 13. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\supabase\lessons.ts`** (Modified)
- **Purpose**: Enhanced lesson operations with course/topic context
- **Additions**: Course linking, topic association, materials processing
- **Integration**: Links with course and materials operations

### AI Integration (Service Files)

#### 14. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\ai\gemini-files.ts`** (New)
- **Purpose**: Gemini file upload and processing service
- **Functions**: uploadFileToGemini, processLessonMaterials, createPartFromUri
- **Features**: Multi-format file support, error handling, TypeScript integration

#### 15. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\ai\prompts.ts`** (Modified)
- **Purpose**: Enhanced prompts with materials context
- **Features**: Dynamic prompt generation based on lesson materials
- **Integration**: Materials-aware system prompts for contextual learning

### Type Definitions (Interface Files)

#### 16. **`c:\Users\mahes\OneDrive\Code\genui-learn-chatbot\nextjs\src\lib\types.ts`** (Modified)
- **Purpose**: Extended type definitions for new features
- **Additions**: Course, Material, Topic interfaces and database types
- **Updates**: Enhanced Lesson interface with course/topic relationships

## Detailed Architecture Connections

### Database Schema Relationships

```sql
-- Courses Table
courses {
  id: UUID PRIMARY KEY
  user_id: UUID REFERENCES auth.users(id)
  name: VARCHAR(255)
  description: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- Materials Table (Extension of existing storage)
materials {
  id: UUID PRIMARY KEY
  user_id: UUID REFERENCES auth.users(id)
  course_id: UUID REFERENCES courses(id)
  file_name: VARCHAR(255)
  file_path: VARCHAR(500)
  file_size: INTEGER
  mime_type: VARCHAR(100)
  topic_tags: TEXT[] -- Array of topic strings
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- Enhanced Lessons Table
lessons {
  id: UUID PRIMARY KEY
  user_id: UUID REFERENCES auth.users(id)
  course_id: UUID REFERENCES courses(id) -- Existing field
  topic_selection: TEXT[] -- New field for selected topics
  title: VARCHAR(255)
  messages: JSONB
  lesson_type: VARCHAR(50)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### API Flow Architecture

#### Materials Management Flow
1. **Course Creation**: `POST /api/courses` → Create course → Return course ID
2. **Material Upload**: `POST /api/courses/[id]/materials` → Upload to Supabase storage → Store metadata
3. **Material Organization**: Topic tagging, file management within course context
4. **Material Deletion**: Two-step confirmation → Remove from storage and database

#### Lesson Creation Flow
1. **Course Selection**: User visits `/app/learn` → Display course cards
2. **Topic Selection**: User selects course → Display topics (if any) → Multi-select interface
3. **Material Processing**: Selected materials → Upload to Gemini → Generate file URIs
4. **Lesson Initialization**: Create lesson with materials context → Enhanced system prompt
5. **AI Interaction**: Context-aware responses based on processed materials

### Component Architecture

```typescript
// Component Hierarchy
AppLayout
├── Materials (/app/storage)
│   ├── CourseSelector (course management)
│   ├── MaterialUpload (drag-drop interface)
│   └── TopicTagger (topic assignment)
├── Learn (/app/learn)
│   ├── CourseSelector (lesson course selection)
│   ├── TopicSelector (topic filtering)
│   └── LessonCreation (materials processing)
└── Lesson (/app/learn/[id])
    ├── Chat (materials-aware)
    └── MaterialsContext (AI integration)
```

### AI Integration Architecture

#### Materials Processing Pipeline
1. **File Upload**: Materials uploaded to Supabase storage in course-based folders
2. **Lesson Creation**: Selected materials processed through Gemini file upload API
3. **Context Generation**: File URIs embedded in system prompt for AI context
4. **Interactive Learning**: AI responses based on processed materials content

#### Supported File Types
- **Documents**: DOC, DOCX, PDF, RTF, TXT, HWP, DOT, DOTX, HWPX
- **Spreadsheets**: XLS, XLSX, CSV, TSV
- **Presentations**: PPTX
- **Images**: JPG, JPEG, PNG, WEBP, HEIF, SVG
- **Audio**: MP3, WAV, FLAC, AAC, AIFF, OGG, MPA, OPUS, M4A, MPGA, PCM
- **Video**: WEBM, MP4, MOV, MPEG, AVI, WMV, 3GPP, FLV
- **Code**: py, js, java, cpp, html
- **Archives**: zip

## Implementation Strategy

### Phase 1: Database Foundation (Week 1)
1. Create Supabase migration for courses and materials tables
2. Set up Row Level Security policies for user data isolation
3. Update TypeScript types and database interfaces
4. Test database operations and relationships

### Phase 2: Backend API Development (Week 2)
1. Implement courses CRUD API routes
2. Create materials management API endpoints
3. Enhance lessons API with course/topic integration
4. Develop Gemini file upload service
5. Update chat API for materials context

### Phase 3: Frontend Integration (Week 3)
1. Enhance Materials page with course management
2. Implement course and topic selection in Learn section
3. Create reusable course and topic selector components
4. Update lesson interface for materials context
5. Test end-to-end workflows

### Phase 4: AI Enhancement (Week 4)
1. Integrate Gemini file processing pipeline
2. Enhance system prompts with materials context
3. Test AI responses with various file types
4. Optimize performance and error handling
5. Conduct comprehensive testing and refinement

## Data Flow Examples

### Material Upload Flow
```typescript
// User uploads material to course
1. User selects course in Materials tab
2. Drags/drops file → triggers upload
3. File uploaded to `/storage/user_id/course_id/filename`
4. Metadata stored in materials table with course_id and optional topic_tags
5. UI updates to show material in course card
```

### Lesson Creation Flow
```typescript
// User creates lesson from course materials
1. User clicks Learn tab → sees course cards
2. Selects course → sees topic options (if materials have topics)
3. Selects topics (or all materials) → clicks "Start Learning"
4. System processes selected materials through Gemini upload
5. Creates lesson with course_id and topic_selection
6. Generates enhanced system prompt with material URIs
7. Redirects to lesson page with materials-aware AI
```

### AI Context Integration
```typescript
// AI processes lesson with materials
1. Lesson initialization includes processed material URIs
2. System prompt includes: "These are the provided materials for the user's study about [topics], refer to these materials only..."
3. AI responses are contextually aware of uploaded materials
4. Socratic questioning based on actual course content
5. Assessment generation tied to material content
```

## Security and Performance Considerations

### Data Protection
- **User Isolation**: RLS policies ensure users only access their own courses/materials
- **File Security**: Course-based folder structure in Supabase storage
- **Input Validation**: Sanitize course names, file uploads, and topic tags
- **Rate Limiting**: Prevent spam course creation and file uploads

### Performance Optimization
- **Lazy Loading**: Load course materials on demand
- **File Processing**: Process materials only at lesson creation (not stored)
- **Efficient Indexing**: Database indexes on user_id, course_id, and timestamps
- **Storage Organization**: Course-based folder structure for better organization

### Error Handling
- **File Upload Failures**: Graceful degradation with retry mechanisms
- **Gemini API Errors**: Fallback to text-only lessons if file processing fails
- **Database Constraints**: Proper foreign key relationships and cascade deletes
- **User Experience**: Clear error messages and loading states

## Future Extensibility

### Planned Enhancements
- **Course Templates**: Pre-built course structures for common subjects
- **Collaborative Courses**: Shared course materials between users
- **Advanced Analytics**: Learning progress tracking across courses
- **Material Versioning**: Track changes to uploaded materials
- **Export/Import**: Course backup and sharing capabilities

### Integration Points
- **Assessment Analytics**: Track performance across course topics
- **Learning Paths**: Guided progression through course materials
- **Recommendation Engine**: Suggest related materials and topics
- **Mobile Support**: Responsive design for mobile learning
- **Third-party Integrations**: LMS system connections

## Success Criteria

1. ✅ Users can create and manage courses through Materials tab
2. ✅ Materials are organized under courses with optional topic tagging
3. ✅ Course selection interface works smoothly in Learn tab
4. ✅ Topic filtering enables focused learning sessions
5. ✅ Materials are successfully processed for AI context
6. ✅ AI provides contextually relevant responses based on materials
7. ✅ File upload supports all specified formats
8. ✅ Deletion workflows include proper confirmation steps
9. ✅ System maintains existing functionality while adding new features
10. ✅ Performance remains optimal with materials processing

## Risk Mitigation

### Potential Issues
1. **Large File Processing**: Gemini API limits and timeouts
   - **Mitigation**: File size validation and chunking strategies

2. **Storage Costs**: Increased file storage in course-based structure
   - **Mitigation**: User storage quotas and cleanup policies

3. **Complex User Flows**: Multiple selection steps may confuse users
   - **Mitigation**: Clear UI guidance and default selections

4. **AI Context Limits**: Too many materials may exceed context windows
   - **Mitigation**: Material selection limits and prioritization

## Technical Dependencies

### Existing Dependencies (Compatible)
- Supabase client libraries and storage ✅
- Vercel AI SDK and Gemini integration ✅
- shadcn/ui components ✅
- React/Next.js 15+ ✅
- Existing lesson and chat functionality ✅

### New Requirements
- @google/genai package for file upload
- Enhanced database migrations
- Course and materials management utilities
- Extended UI components for course/topic selection
- File processing service integration

This implementation provides a robust foundation for materials-driven learning while maintaining the simplicity and effectiveness of the existing system. The architecture supports future enhancements while delivering immediate value through contextual AI-assisted learning.