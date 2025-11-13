# Flashcards Generative UI Implementation Briefing

## Project Overview

This briefing outlines the implementation of Flashcards generative UI components for the NextJS learning application, extending the existing MCQ and True/False GenUI system. The AI will intelligently decide when to generate flashcards as part of the educational toolset, prioritizing active recall and spaced repetition for key concepts from lesson materials.

## Current Architecture Analysis

### Existing GenUI System (Reference Implementation)
- **Framework**: Next.js 15.1.3 with TypeScript and Vercel AI SDK v4.3.19
- **AI Model**: Google Gemini 2.5 Flash Lite via streaming text with tool calling
- **Components**: MCQComponent and TFComponent with markdown support, visual states, and interactive feedback
- **Schemas**: Zod-based validation for structured AI output (mcqSchema, tfSchema)
- **Integration**: Tool-based generation triggered by uncertainty detection and educational context
- **Silent Summary**: Automatic performance tracking sent to AI for adaptive learning

### Key Files in Current GenUI Implementation
- **`src/lib/ai/lesson-schemas.ts`**: MCQ and TF schema definitions and validation
- **`src/components/ui/mcq-component.tsx`**: React component with markdown rendering and state management
- **`src/components/ui/tf-component.tsx`**: True/False component with batch submission
- **`src/lib/ai/lesson-actions.ts`**: Server actions for MCQ and TF generation
- **`src/app/api/chat/route.ts`**: AI integration with tool calling (generateMCQ, generateTF)
- **`src/components/ui/chat.tsx`**: Message parsing, component rendering, and silent summary generation
- **`src/lib/ai/prompts.ts`**: System prompts and generation guidelines

### Storage and Materials System
- **Course Organization**: Courses → Topics → Materials structure in Supabase
- **Material Processing**: Uploaded files processed through Gemini File API for contextualized learning
- **Database Tables**: courses, materials, topics, lessons with proper RLS policies
- **Silent Summary Storage**: Assessment results tracked in lesson messages for AI continuity

## Implementation Goal

Create a Flashcards component system that:
1. **Parallels Existing Architecture**: Uses same patterns for schemas, actions, and integration as MCQ/TF
2. **AI-Driven Selection**: Model chooses between MCQ, TF, and Flashcards based on learning context
3. **Active Recall Focus**: Generates 3 flashcards that test retention of key material concepts
4. **Individual Storage**: Allows users to save individual flashcards to personal collection
5. **Adaptive Assessment**: Tracks performance (Got it, On track, Still unclear) for learning analytics

## Essential File Paths

### Files to Create (New)
1. **`src/components/ui/flashcard-component.tsx`** - React component for flashcard rendering with flip animation
2. **`src/components/ui/flashcard-loading.tsx`** - Loading animation for flashcard generation
3. **`src/lib/supabase/flashcards.ts`** - Database operations for storing/retrieving user flashcards
4. **`supabase/migrations/20250918000001_create_flashcards_table.sql`** - Database schema for flashcard storage

### Files to Modify (Existing)
1. **`src/lib/ai/lesson-schemas.ts`** - Add flashcard schemas alongside MCQ and TF schemas
2. **`src/lib/ai/lesson-actions.ts`** - Add flashcard generation action
3. **`src/app/api/chat/route.ts`** - Add generateFlashcards tool alongside existing tools
4. **`src/components/ui/chat.tsx`** - Add flashcard parsing, rendering, and silent summary logic
5. **`src/lib/ai/prompts.ts`** - Add flashcard generation guidelines and AI decision logic
6. **`src/lib/types.ts`** - Add flashcard-related TypeScript interfaces

### Files to Reference (Read-only)
1. **`src/components/ui/mcq-component.tsx`** - Pattern reference for component structure and interactions
2. **`src/components/ui/tf-component.tsx`** - Pattern reference for assessment feedback and state management
3. **`src/components/ui/button.tsx`** - Existing button styles for feedback buttons
4. **`src/components/ui/card.tsx`** - Existing card styles for flashcard container

## Technical Architecture

### 1. Flashcard Schema Design (Zod)
```typescript
// Individual flashcard schema
export const flashcardSchema = z.object({
  id: z.string().describe("Unique flashcard identifier (1, 2, 3)"),
  concept: z.string().describe("The concept/term to be tested"),
  definition: z.string().describe("The definition/explanation of the concept"),
  topic: z.string().describe("The specific topic this flashcard covers"),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("Difficulty level")
});

// Flashcard set schema
export const flashcardSetSchema = z.object({
  topic: z.string().describe("Overall learning topic for the flashcard set"),
  flashcards: z.array(flashcardSchema)
    .length(3)
    .describe("Array of exactly 3 flashcards"),
  materialContext: z.string().describe("Context from lesson materials that informed these flashcards"),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("Overall difficulty level")
});
```

### 2. Flashcard Component Features
- **Flip Animation**: CSS-based card flip from concept to definition
- **Navigation Controls**: Left/right arrows in top-right for card navigation
- **Performance Tracking**: "Got it", "On the right track", "Still unclear" buttons
- **Individual Storage**: Flag option to save specific flashcards to personal collection
- **Visual States**: Current card indicator, progress display
- **Markdown Support**: All text content supports markdown formatting
- **Consistent Styling**: Matches MCQ/TF component design patterns

### 3. AI Integration Strategy
- **Triple Tool System**: generateMCQ, generateTF, generateFlashcards tools available
- **Context-Aware Selection**: AI chooses based on learning enhancement:
  - **MCQ**: For testing understanding, applying concepts, choosing between options
  - **TF**: For clarifying misconceptions, verifying understanding, exploring nuances
  - **Flashcards**: For retention testing, concept memorization, key term review
- **Material-Driven**: Flashcards focus on most assessable content from provided materials
- **Bias Toward Assessment**: MCQ remains default, flashcards for specific retention needs
- **Uncertainty Detection**: Same triggers as existing assessment system

### 4. Component Integration Flow
```
User Input → AI Analysis → [Text Response | MCQ Tool | TF Tool | Flashcards Tool] → Component Rendering → Performance Tracking → Storage Decision
```

### 5. Storage Architecture
```
Flashcard Storage Flow:
Generated Flashcards → User Reviews → Individual Save Decisions → Database Storage → Future Retrieval as GenUI
```

## File Dependencies and Connections

### Schema Layer (`lesson-schemas.ts`)
```
mcqSchema (existing)
├── mcqOptionSchema
└── Helper functions

tfSchema (existing)
├── tfStatementSchema
└── Validation helpers

flashcardSetSchema (new)
├── flashcardSchema
└── Storage helpers
```

### Action Layer (`lesson-actions.ts`)
```
generateMCQAction (existing)
├── Uses mcqSchema
└── Returns MCQ object

generateTFAction (existing)
├── Uses tfSchema
└── Returns TF object

generateFlashcardsAction (new)
├── Uses flashcardSetSchema
└── Returns FlashcardSet object
```

### API Layer (`route.ts`)
```
streamText with tools:
├── generateMCQ (existing)
├── generateTF (existing)
└── generateFlashcards (new)
```

### Component Layer
```
Chat Component
├── MCQ parsing & rendering (existing)
├── TF parsing & rendering (existing)
└── Flashcards parsing & rendering (new)
    ├── FlashcardComponent
    ├── FlashcardLoading
    └── Individual save functionality
```

### Storage Layer (`flashcards.ts`)
```
Database Operations:
├── saveFlashcard(flashcard, courseId, topicId)
├── getUserFlashcards(courseId?, topicId?)
├── deleteFlashcard(flashcardId)
└── getFlashcardsByTopic(topicId)
```

## Implementation Strategy

### Phase 1: Schema and Database Setup
1. **Extend lesson-schemas.ts** with flashcard schemas
2. **Create flashcards database migration** with proper RLS policies
3. **Add flashcard database operations** following existing patterns
4. **Create FlashcardComponent** following MCQ/TF patterns

### Phase 2: AI Integration
1. **Add generateFlashcards action** to lesson-actions.ts
2. **Add generateFlashcards tool** to route.ts
3. **Update prompts.ts** with flashcard generation guidelines
4. **Enhance system prompt** to choose between MCQ/TF/Flashcards appropriately

### Phase 3: Chat Integration
1. **Add flashcard parsing logic** to chat.tsx (parallel to MCQ/TF parsing)
2. **Add flashcard rendering** in message display logic
3. **Implement silent summary** for flashcard performance tracking
4. **Add individual save functionality** with database integration

### Phase 4: Storage and Retrieval
1. **Create flashcard management API** endpoints
2. **Implement save/delete operations** for individual flashcards
3. **Add flashcard retrieval** functionality for future GenUI
4. **Test end-to-end storage workflow**

## AI Decision Logic Guidelines

### When AI Should Generate MCQ (Default Preference):
- Testing application of concepts with multiple valid approaches
- Choosing between different methods or solutions
- Comparing and contrasting multiple options
- Assessment of understanding across broader topics

### When AI Should Generate T/F (Specific Use Cases):
- Clarifying common misconceptions
- Verifying specific factual understanding
- Exploring nuanced aspects of concepts
- Breaking down complex topics into discrete elements

### When AI Should Generate Flashcards (Retention Focus):
- Testing memorization of key terms and definitions
- Reinforcing core concepts from lesson materials
- Supporting spaced repetition and active recall
- Consolidating learned material for long-term retention
- When user explicitly mentions memorization or recall needs

### Adaptive Learning Approach:
- **MCQ**: "Which approach would work best for X scenario?" (application)
- **T/F**: "Let's explore key aspects of X. Determine accuracy?" (exploration)
- **Flashcards**: "Let's reinforce these key concepts from your materials." (retention)

## Component Specifications

### FlashcardComponent Props Interface
```typescript
interface FlashcardComponentProps {
  flashcardSet: FlashcardSet;
  onAnswer?: (flashcardId: string, performance: 'got-it' | 'on-track' | 'unclear') => void;
  onSave?: (flashcardId: string, shouldSave: boolean) => void;
  className?: string;
  lessonContext?: {
    courseId?: string;
    topicSelection?: string[];
  };
}
```

### Flashcard Component Interaction Flow
1. **Display**: Show first flashcard with concept side facing up
2. **Navigation**: Left/right arrows to navigate between 3 flashcards
3. **Flip Interaction**: Click on card to flip from concept to definition
4. **Performance Assessment**: Three buttons - "Got it", "On the right track", "Still unclear"
5. **Storage Decision**: Flag icon to save individual flashcards to personal collection
6. **Silent Summary**: Generate performance summary for AI context

### Visual Design Consistency
- **Header**: Same icon style as MCQ/TF (Brain or Card icon)
- **Title**: "Quick Review: Flashcards" to match existing pattern
- **Topic/Difficulty**: Identical badge styling as MCQ/TF
- **Card Design**: Clean flip animation with concept/definition sides
- **Colors**: Identical to MCQ/TF - Green (got it), Orange (on track), Red (unclear), Blue (primary)
- **Typography**: Exact match to MCQ/TF font sizes and spacing
- **Navigation**: Subtle arrow controls in top-right corner

## Database Schema

### Flashcards Table Structure
```sql
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  topic_tags TEXT[] DEFAULT '{}',
  concept TEXT NOT NULL,
  definition TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty VARCHAR(10) DEFAULT 'medium',
  source_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS Policies
- Users can only access their own flashcards
- Flashcards inherit course access permissions
- Proper indexing for efficient queries by course/topic

## Silent Summary Integration

### Flashcard Summary Format
```
"SILENT_SUMMARY: User completed flashcard review about [topic]. Results: Card 1 ([concept]): [performance], Card 2 ([concept]): [performance], Card 3 ([concept]): [performance]. Saved flashcards: [list]. Overall retention: [analysis]"
```

### Performance Tracking
- Track individual flashcard performance for adaptive difficulty
- Generate summary for AI to adjust subsequent content
- Store performance data for spaced repetition algorithms

## Success Criteria

1. **AI Intelligence**: Model appropriately chooses between MCQ, TF, and Flashcards based on context
2. **Component Consistency**: Flashcard components match existing styling and behavior patterns
3. **Retention Effectiveness**: Flashcards test key concepts from lesson materials effectively
4. **Storage Functionality**: Individual flashcard saving and retrieval works seamlessly
5. **User Experience**: Smooth flip animations and intuitive navigation controls
6. **Performance Integration**: Silent summaries provide meaningful context to AI

## Risk Mitigation

### Technical Risks
- **Schema Conflicts**: Use distinct naming to avoid MCQ/TF/Flashcard confusion
- **Animation Performance**: Ensure CSS animations don't impact component rendering
- **Storage Scalability**: Design database schema for efficient flashcard retrieval

### Educational Risks
- **Tool Overuse**: Ensure AI understands when flashcards vs. other tools are appropriate
- **Content Quality**: Flashcards must test truly assessable material, not trivial details
- **Retention Focus**: Maintain focus on key concepts rather than minor details

## Code Patterns to Follow

### From MCQ/TF Implementation:
1. **Schema Structure**: Similar validation and helper functions
2. **Component Architecture**: State management, styling patterns, event handling
3. **AI Integration**: Tool definition, parameter structure, response parsing
4. **Loading States**: Consistent animation and messaging patterns
5. **Silent Summary**: Same pattern for performance tracking and AI feedback

### Key Adaptations for Flashcards:
1. **Flip Animation**: CSS-based card flip between concept and definition
2. **Individual Storage**: Save/delete functionality for personal flashcard collection
3. **Navigation Controls**: Left/right arrows for seamless card navigation
4. **Performance Granularity**: Three-level assessment instead of binary correct/incorrect

This implementation extends the proven MCQ/TF system with a complementary flashcards component, giving the AI more nuanced tools for comprehensive learning while maintaining consistency with existing patterns and user experience. The focus on material-driven content and individual storage creates a powerful active recall system integrated into the conversational learning flow.