# MCQ Generative UI Implementation Briefing

## Project Overview

This briefing outlines the implementation of Generative UI features for the Learn page in the NextJS application, specifically focusing on multiple choice questions (MCQ) that appear dynamically within the chat interface when the AI detects user uncertainty, plus enhanced scroll behavior.

## Current Architecture Analysis

### NextJS Project Structure
- **Framework**: Next.js 15.1.3 with TypeScript
- **AI SDK**: Vercel AI SDK v4.3.19 with Google Gemini integration
- **UI Components**: Radix UI + Custom components with Tailwind CSS
- **Current Learn Page**: Basic chat interface at `src/app/app/learn/page.tsx`
- **Chat API**: Google Gemini 2.5 Flash Lite via `src/app/api/chat/route.ts`

### Gemini Chatbot Reference
- **Advanced Components**: Flight booking system, weather widgets, multimodal input
- **Smart Scroll**: MutationObserver-based smooth scrolling in `use-scroll-to-bottom.ts`
- **Generative UI**: Uses AI SDK's `generateUI` with tool calling

## Implementation Goal

Transform the current basic chat interface into an interactive learning environment where:
1. AI automatically detects user uncertainty and generates MCQ components inline
2. MCQ components integrate seamlessly with chat messages
3. Enhanced scroll behavior works with both text and interactive components
4. All interactions maintain learning context and progress

## Essential File Paths

### Files to Create (New)
1. `src/lib/ai/lesson-schemas.ts` - Zod schemas for MCQ structure
2. `src/components/ui/mcq-component.tsx` - React component for MCQ rendering
3. `src/lib/ai/lesson-actions.ts` - Server actions with generateUI
4. `src/hooks/use-scroll-to-bottom.ts` - Enhanced scroll behavior
5. `src/lib/ai/prompts.ts` - System prompts for MCQ generation

### Files to Modify (Existing)
1. `src/app/app/learn/page.tsx` - Convert to use Vercel AI SDK's useUIState
2. `src/app/api/chat/route.ts` - Update to support tool calling
3. `src/components/ui/chat.tsx` - Integrate enhanced scroll and MCQ support
4. `package.json` - Add Zod dependency
5. `src/app/app/layout.tsx` - Add AI provider wrapper

### Files to Reference (Read-only)
1. `src/components/ui/button.tsx` - Existing button styles
2. `src/components/ui/card.tsx` - Existing card styles
3. `src/lib/utils.ts` - Utility functions
4. `tailwind.config.ts` - Style configuration

## Technical Architecture

### 1. MCQ Schema Design (Zod)
```typescript
// Multiple choice with single correct answer
export const mcqSchema = z.object({
  question: z.string().describe("The main question text"),
  options: z.array(z.object({
    id: z.string().describe("Unique option identifier"),
    text: z.string().describe("Option text"),
    isCorrect: z.boolean().describe("Whether this is the correct answer")
  })).describe("Array of 4 answer options"),
  explanation: z.string().describe("Explanation shown after answer submission"),
  topic: z.string().describe("Learning topic this question covers")
});
```

### 2. MCQ Component Features
- **Visual States**: Default, selected, submitted (correct/incorrect)
- **Color Coding**: Green for correct, red for incorrect after submission
- **Interactive Elements**: Clickable options, submit button, explanation reveal
- **Accessibility**: Proper ARIA labels, keyboard navigation
- **Animation**: Smooth transitions for state changes

### 3. AI Integration Strategy
- **Tool Definition**: MCQ generation tool with structured output
- **Trigger Detection**: AI analyzes user responses for uncertainty patterns
- **Context Awareness**: Questions generated based on current conversation topic
- **Learning Progression**: Tracks user understanding and adjusts difficulty

### 4. Enhanced Scroll Behavior
- **MutationObserver**: Detects DOM changes including MCQ component insertion
- **Smooth Scrolling**: Maintains view on latest content during AI generation
- **Component Awareness**: Handles both text messages and interactive components
- **Performance**: Optimized for frequent updates during AI streaming

## Implementation Flow

### Phase 1: Foundation Setup
1. Add Zod dependency to package.json
2. Create lesson schemas with MCQ structure
3. Implement basic MCQ React component
4. Set up enhanced scroll hook

### Phase 2: AI Integration
1. Create server actions with generateUI
2. Define MCQ generation tool for AI
3. Update system prompts for uncertainty detection
4. Modify chat API to support tool calling

### Phase 3: UI Integration
1. Convert Learn page to use useUIState/useActions
2. Integrate MCQ component into chat flow
3. Apply enhanced scroll behavior
4. Style integration with existing design system

### Phase 4: Polish & Testing
1. Add loading states and animations
2. Implement proper error handling
3. Test MCQ generation accuracy
4. Optimize scroll performance

## Key Integration Points

### Chat Message Flow
```
User Input → AI Analysis → [Text Response | MCQ Tool Call] → Component Rendering → Scroll Update
```

### State Management
- **useUIState**: Manages conversation including MCQ components
- **useActions**: Handles server action calls
- **Local State**: MCQ component internal state (selected option, submitted state)

### Styling Consistency
- Use existing Tailwind classes from current chat interface
- Match card styling for MCQ containers
- Consistent button styling across components
- Proper spacing and typography hierarchy

## Success Criteria

1. **Seamless Integration**: MCQ components appear naturally within chat flow
2. **AI Accuracy**: Relevant questions generated based on learning context
3. **Smooth UX**: Enhanced scroll maintains focus during interactions
4. **Visual Polish**: Components match existing design language
5. **Performance**: No lag during AI generation or component rendering

## Dependencies & Considerations

### New Dependencies
- `zod`: Schema validation for structured AI output
- Enhanced AI SDK usage with `generateUI`

### Existing Dependencies (Leverage)
- Vercel AI SDK for streaming and tool calling
- Radix UI components for consistent styling
- Tailwind CSS for responsive design
- React 19 with concurrent features

### Technical Considerations
- Server-side rendering compatibility
- Mobile responsiveness for MCQ components
- Accessibility compliance (WCAG 2.1)
- Performance optimization for real-time updates

This implementation will transform the Learn page from a simple chat interface into an intelligent, interactive learning environment that adapts to user needs and provides immediate feedback through dynamically generated MCQ components.
