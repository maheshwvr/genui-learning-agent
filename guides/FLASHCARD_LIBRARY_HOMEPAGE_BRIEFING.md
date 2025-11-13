# Flashcard Library Homepage Implementation Briefing

## Project Overview

This briefing outlines the implementation of a flashcard library on the main dashboard homepage (`/`) that displays all user-saved flashcards from chat lessons, organized by course. This extends the existing flashcard generative UI system by providing a centralized location for users to view, study, and manage their saved flashcard collection.

## Implementation Goal

Create a flashcard library section on the homepage dashboard that:
1. **Displays User's Saved Flashcards**: Shows all flashcards saved during chat lessons, organized by course
2. **Course-Based Organization**: Groups flashcards by the courses they belong to, with clear visual separation
3. **Study Interface**: Provides an interactive study mode for saved flashcards
4. **Management Actions**: Allows users to delete flashcards and filter by course/topics
5. **Dashboard Integration**: Seamlessly integrates with the existing dashboard layout and design patterns

## Current Architecture Analysis

### Existing Flashcard System
- **Generative UI**: FlashcardComponent already implemented with flip animations, performance tracking, and save functionality
- **Database Schema**: `flashcards` table with user_id, course_id, topic_tags, concept, definition, and other metadata
- **Storage Operations**: Complete CRUD operations in `src/lib/supabase/flashcards.ts`
- **Integration**: Flashcards are generated in chat lessons and can be individually saved to personal collection

### Dashboard Structure
- **Location**: Main dashboard at `/` route using `DashboardContent` component
- **Layout**: Uses Card-based layout with "Get Started" section containing navigation cards
- **Navigation**: Homepage accessible via "Homepage" link in sidebar navigation
- **Design Pattern**: Follows consistent UI patterns with AnimatedLinkCard components and Card wrappers

## Essential File Paths

### Files to Create (New)
1. **`src/components/ui/flashcard-library.tsx`** - Main flashcard library component for homepage display
2. **`src/components/ui/flashcard-study-mode.tsx`** - Interactive study interface for saved flashcards
3. **`src/components/ui/course-flashcard-group.tsx`** - Component to display flashcards grouped by course

### Files to Modify (Existing)
1. **`src/components/DashboardContent.tsx`** - Add flashcard library section to homepage dashboard
2. **`src/lib/supabase/flashcards.ts`** - Add any additional query functions if needed for course grouping

### Files to Reference (Read-only)
1. **`src/components/ui/flashcard-component.tsx`** - Reference for flashcard display patterns and interactions
2. **`src/components/ui/course-selector.tsx`** - Reference for course-based UI patterns
3. **`src/app/app/storage/page.tsx`** - Reference for materials management and course organization patterns

## Technical Architecture

### Component Hierarchy
```
DashboardContent
├── Existing Welcome Header
├── Existing "Get Started" Card Section
└── Flashcard Library Card (new)
    ├── FlashcardLibrary
    │   ├── Course Filter/Selector
    │   ├── CourseFlashcardGroup (per course)
    │   │   ├── Course Header
    │   │   ├── Flashcard Grid/List
    │   │   └── Study Mode Button
    │   └── Empty State (no saved flashcards)
    └── FlashcardStudyMode (modal/overlay)
        ├── Current Flashcard Display
        ├── Navigation Controls
        ├── Performance Tracking
        └── Delete/Manage Actions
```

### Data Flow
```
Homepage Load → getUserFlashcards() → Group by Course → Display in CourseFlashcardGroup → Study Mode on Click
```

### Database Integration
- **Primary Query**: `getUserFlashcards()` to fetch all user flashcards
- **Course Grouping**: Group flashcards by `course_id` and fetch course names
- **Filtering**: Optional filtering by course or topic tags
- **Management**: Delete functionality using existing `deleteFlashcard()`

## Component Specifications

### FlashcardLibrary Component
```typescript
interface FlashcardLibraryProps {
  className?: string;
}
```

**Features:**
- Fetches all user flashcards on component mount
- Groups flashcards by course (with "No Course" for null course_id)
- Provides course filtering options
- Shows flashcard count per course
- Handles loading and error states
- Responsive grid layout for course groups

### CourseFlashcardGroup Component
```typescript
interface CourseFlashcardGroupProps {
  courseId: string | null;
  courseName: string;
  flashcards: SavedFlashcard[];
  onFlashcardDelete: (flashcardId: string) => void;
  onStudyMode: (flashcards: SavedFlashcard[]) => void;
}
```

**Features:**
- Displays course name and flashcard count
- Shows preview of first few flashcards (concept only)
- "Study All" button to start study mode for course flashcards
- Individual flashcard delete options
- Expandable/collapsible course sections

### FlashcardStudyMode Component
```typescript
interface FlashcardStudyModeProps {
  flashcards: SavedFlashcard[];
  isOpen: boolean;
  onClose: () => void;
  onFlashcardDelete: (flashcardId: string) => void;
}
```

**Features:**
- Modal or overlay interface for focused studying
- Flashcard flip animation (reuse from FlashcardComponent)
- Progress indicator (X of Y flashcards)
- Navigation controls (previous/next)
- Delete current flashcard option
- Keyboard navigation support
- Performance tracking (optional)

## Implementation Strategy

### Phase 1: Basic Display
1. **Create FlashcardLibrary component** with basic fetch and display functionality
2. **Create CourseFlashcardGroup component** for course-based grouping
3. **Integrate into DashboardContent** as a new card section
4. **Test data fetching and course grouping**

### Phase 2: Study Interface
1. **Create FlashcardStudyMode component** with modal interface
2. **Implement flashcard navigation and flip animations**
3. **Add delete functionality and state management**
4. **Test study mode workflows**

### Phase 3: Enhancement and Polish
1. **Add filtering and search capabilities**
2. **Implement responsive design for mobile**
3. **Add empty states and loading animations**
4. **Performance optimization and error handling**

## Database Queries Needed

### Primary Queries (Using Existing Functions)
```typescript
// Fetch all user flashcards
const flashcards = await getUserFlashcards();

// Group by course and fetch course names
const courseFlashcards = groupFlashcardsByCourse(flashcards);

// Delete specific flashcard
await deleteFlashcard(flashcardId);
```

### Additional Helper Function (If Needed)
```typescript
// Group flashcards by course with course name resolution
async function getFlashcardsGroupedByCourse(): Promise<{
  [courseId: string]: {
    courseName: string;
    flashcards: SavedFlashcard[];
  }
}>;
```

## UI/UX Design Patterns

### Following Existing Patterns
- **Card Layout**: Use same Card component structure as existing dashboard sections
- **Course Organization**: Follow patterns from materials management (CourseSelector, course cards)
- **Flashcard Display**: Reuse visual patterns from FlashcardComponent
- **Loading States**: Consistent with existing LoadingSpinner and skeleton states
- **Error Handling**: Same Alert component patterns for error messages

### Layout Integration
- **Position**: Add as third major section after "Get Started" cards
- **Title**: "Your Flashcard Library" or "Saved Flashcards"
- **Description**: "Review and study flashcards saved from your lessons"
- **Responsive**: Adapt to existing responsive grid patterns

## Success Criteria

1. **Functional Integration**: Seamlessly integrates with existing dashboard without breaking layouts
2. **Data Accuracy**: Correctly displays all user-saved flashcards grouped by course
3. **Study Experience**: Provides effective study interface with flashcard interactions
4. **Performance**: Fast loading of flashcard data and smooth animations
5. **Management**: Easy deletion and organization of saved flashcards
6. **Responsive Design**: Works across desktop, tablet, and mobile devices
7. **Consistency**: Maintains visual and interaction consistency with existing components

## Code Patterns to Follow

### From Existing Dashboard Components
1. **Component Structure**: Same patterns as DashboardContent and AnimatedLinkCard components
2. **Data Fetching**: useCallback and useEffect patterns for async data loading
3. **State Management**: useState for component-level state, consistent error handling
4. **Styling**: Tailwind classes and component design patterns from existing cards

### From Existing Flashcard System
1. **Flashcard Display**: Visual patterns and interactions from FlashcardComponent
2. **Database Operations**: Use existing functions from flashcards.ts
3. **Course Integration**: Patterns from course-selector and materials management
4. **Loading States**: Consistent loading animations and skeleton components

### From Materials Management
1. **Course Grouping**: Visual grouping patterns from storage page
2. **Item Management**: Delete actions and confirmation patterns
3. **Filter/Search**: If implementing filtering, follow storage page patterns
4. **Empty States**: Consistent messaging for no content scenarios

This implementation creates a centralized flashcard library that enhances the learning experience by providing easy access to all saved flashcards while maintaining consistency with the existing design system and architecture patterns.