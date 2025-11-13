# True/False Generative UI Implementation Briefing

## Project Overview

This briefing outlines the implementation of True/False (T/F) generative UI components for the NextJS learning application, extending the existing MCQ generative UI system. The AI will dynamically decide between generating MCQ or T/F components based on what's most appropriate for Socratic learning - guiding users toward answers rather than feeding them solutions.

## Current Architecture Analysis

### Existing MCQ System (Reference Implementation)
- **Framework**: Next.js 15.1.3 with TypeScript and Vercel AI SDK v4.3.19
- **AI Model**: Google Gemini 2.5 Flash Lite via streaming text with tool calling
- **Components**: MCQComponent with markdown support, visual states, and interactive feedback
- **Schemas**: Zod-based validation for structured AI output
- **Integration**: Tool-based generation triggered by uncertainty detection

### Key Files in Current MCQ Implementation
- **`src/lib/ai/lesson-schemas.ts`**: MCQ schema definitions and validation
- **`src/components/ui/mcq-component.tsx`**: React component with markdown rendering
- **`src/lib/ai/lesson-actions.ts`**: Server actions for MCQ generation
- **`src/app/api/chat/route.ts`**: AI integration with tool calling
- **`src/components/ui/chat.tsx`**: Message parsing and component rendering
- **`src/lib/ai/prompts.ts`**: System prompts and generation guidelines

## Implementation Goal

Create a True/False component system that:
1. **Parallels MCQ Architecture**: Uses same patterns for schemas, actions, and integration
2. **AI-Driven Selection**: Model chooses between MCQ and T/F based on learning context
3. **Socratic Learning**: Generates 3 T/F statements that guide discovery, not test memory
4. **Seamless Integration**: Works within existing chat flow with consistent styling
5. **Interactive Feedback**: Provides immediate validation and explanations

## Essential File Paths

### Files to Create (New)
1. **`src/components/ui/tf-component.tsx`** - React component for T/F rendering
2. **`src/components/ui/tf-loading.tsx`** - Loading animation for T/F generation

### Files to Modify (Existing)
1. **`src/lib/ai/lesson-schemas.ts`** - Add T/F schemas alongside MCQ schemas
2. **`src/lib/ai/lesson-actions.ts`** - Add T/F generation action
3. **`src/app/api/chat/route.ts`** - Add generateTF tool alongside generateMCQ
4. **`src/components/ui/chat.tsx`** - Add T/F parsing and rendering logic
5. **`src/lib/ai/prompts.ts`** - Add T/F generation guidelines and triggers

### Files to Reference (Read-only)
1. **`src/components/ui/mcq-component.tsx`** - Pattern reference for component structure
2. **`src/components/ui/mcq-loading.tsx`** - Loading component pattern
3. **`src/components/ui/button.tsx`** - Existing button styles
4. **`src/components/ui/card.tsx`** - Existing card styles

## Technical Architecture

### 1. T/F Schema Design (Zod)
```typescript
// True/False statement schema
export const tfStatementSchema = z.object({
  id: z.string().describe("Statement identifier (1, 2, 3)"),
  text: z.string().describe("The statement text to evaluate"),
  isTrue: z.boolean().describe("Whether the statement is true or false"),
  explanation: z.string().describe("Brief explanation for the correct answer")
});

// True/False component schema
export const tfSchema = z.object({
  topic: z.string().describe("Learning topic this T/F covers"),
  statements: z.array(tfStatementSchema)
    .length(3)
    .describe("Array of exactly 3 true/false statements"),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("Difficulty level"),
  overallExplanation: z.string().describe("Summary explanation after all answers")
});
```

### 2. T/F Component Features
- **3 Statements**: Each with T/F buttons, all must be answered before submission
- **Batch Submission**: Answer all 3 statements, then single submit for all feedback
- **Visual States**: Correct (green), incorrect (red), unanswered (neutral)
- **Complete Feedback**: Shows results for all statements plus overall explanation
- **Markdown Support**: All text content supports markdown formatting
- **Consistent Styling**: Identical to MCQ component (no color distinction)

### 3. AI Integration Strategy
- **Dual Tool System**: Both generateMCQ and generateTF tools available
- **Subtle MCQ Bias**: AI slightly favors MCQ when both would be educationally appropriate
- **Context-Aware Selection**: AI chooses based on learning enhancement:
  - **MCQ**: For testing understanding, applying concepts, choosing between options
  - **T/F**: For clarifying misconceptions, verifying understanding, exploring nuances
- **Socratic Approach**: T/F statements guide users to discover answers through reasoning
- **Uncertainty Detection**: Same triggers as MCQ system

### 4. Component Integration Flow
```
User Input → AI Analysis → [Text Response | MCQ Tool | TF Tool] → Component Rendering → Feedback
```

## File Dependencies and Connections

### Schema Layer (`lesson-schemas.ts`)
```
mcqSchema (existing)
├── mcqOptionSchema
└── Helper functions

tfSchema (new)
├── tfStatementSchema
└── Validation helpers
```

### Action Layer (`lesson-actions.ts`)
```
generateMCQAction (existing)
├── Uses mcqSchema
└── Returns MCQ object

generateTFAction (new)
├── Uses tfSchema
└── Returns TF object
```

### API Layer (`route.ts`)
```
streamText with tools:
├── generateMCQ (existing)
└── generateTF (new)
```

### Component Layer
```
Chat Component
├── MCQ parsing & rendering (existing)
└── TF parsing & rendering (new)
    ├── TFComponent
    └── TFLoading
```

## Implementation Strategy

### Phase 1: Schema and Action Setup
1. **Extend lesson-schemas.ts** with T/F schemas
2. **Add generateTFAction** to lesson-actions.ts
3. **Create TFComponent** following MCQ patterns
4. **Create TFLoading** component

### Phase 2: AI Integration
1. **Add generateTF tool** to route.ts
2. **Update prompts.ts** with T/F generation guidelines
3. **Enhance system prompt** to choose between MCQ/T/F appropriately

### Phase 3: Chat Integration
1. **Add T/F parsing logic** to chat.tsx (parallel to MCQ parsing)
2. **Add T/F rendering** in message display logic
3. **Update extraction functions** to handle both component types

### Phase 4: Testing and Polish
1. **Test AI decision making** between MCQ and T/F
2. **Verify component styling** consistency
3. **Test markdown rendering** in T/F components
4. **Optimize loading states** and transitions

## AI Decision Logic Guidelines

### When AI Should Generate MCQ (Default Preference):
- Testing application of concepts with multiple valid approaches
- Choosing between different methods or solutions
- Comparing and contrasting multiple options
- Assessment of understanding across broader topics
- **When both MCQ and T/F would work**: Subtle bias toward MCQ

### When AI Should Generate T/F (Specific Use Cases):
- Clarifying common misconceptions
- Verifying specific factual understanding
- Exploring nuanced aspects of a concept with subtle distinctions
- Addressing yes/no conceptual questions
- Breaking down complex topics into discrete true/false elements

### Socratic Learning Approach:
- **MCQ**: "Which approach would work best for X scenario?" (application)
- **T/F**: "Let's explore some key aspects of X. Determine which statements are accurate?" (discovery)

### Difficulty Implementation:
- **Easy**: Clear, obvious true/false distinctions
- **Medium**: Requires careful consideration and understanding
- **Hard**: Subtle distinctions requiring deep conceptual knowledge

## Component Specifications

### TFComponent Props Interface
```typescript
interface TFComponentProps {
  tf: TF;
  onAnswer?: (results: { statementId: string; isCorrect: boolean }[]) => void;
  className?: string;
}
```

### T/F Component Interaction Flow
1. **Display**: Show all 3 statements with T/F buttons
2. **Selection**: User selects True or False for each statement
3. **Validation**: Submit button only enabled when all 3 are answered
4. **Submission**: Single submit reveals all results simultaneously
5. **Feedback**: Show correct/incorrect for each + overall explanation

### Visual Design Consistency
- **Header**: Same icon style as MCQ (HelpCircle icon)
- **Title**: "Quick Check: True/False" instead of "Quick Check"
- **Topic/Difficulty**: Identical badge styling as MCQ
- **Statements**: Card-like layout with T/F buttons
- **Colors**: Identical to MCQ - Green (correct), Red (incorrect), Blue (primary/neutral)
- **Typography**: Exact match to MCQ font sizes and spacing
- **No Visual Distinction**: Users distinguish only by title text

## Success Criteria

1. **AI Intelligence**: Model appropriately chooses between MCQ and T/F based on context
2. **Component Consistency**: T/F components match MCQ styling and behavior patterns
3. **Socratic Effectiveness**: T/F statements guide discovery rather than test rote knowledge
4. **Seamless Integration**: No disruption to existing MCQ functionality
5. **User Experience**: Smooth interactions with immediate feedback and clear explanations

## Risk Mitigation

### Technical Risks
- **Schema Conflicts**: Use distinct naming to avoid MCQ/T/F confusion
- **Parsing Complexity**: Parallel parsing logic for both component types
- **AI Tool Selection**: Clear prompting to guide appropriate tool choice

### Educational Risks
- **Tool Misuse**: Ensure AI understands when T/F vs MCQ is appropriate
- **Statement Quality**: T/F statements must be educational, not trivial
- **Feedback Clarity**: Explanations must enhance understanding

## Code Patterns to Follow

### From MCQ Implementation:
1. **Schema Structure**: Similar validation and helper functions
2. **Component Architecture**: State management, styling patterns, event handling
3. **AI Integration**: Tool definition, parameter structure, response parsing
4. **Loading States**: Consistent animation and messaging patterns
5. **Markdown Support**: Same ReactMarkdown integration approach

### Key Adaptations for T/F:
1. **Three Statements**: Instead of four options
2. **Binary Choices**: True/False instead of A/B/C/D
3. **Individual Feedback**: Per-statement explanations
4. **Progressive Disclosure**: Answer statements individually or all at once

This implementation extends the proven MCQ system with a complementary T/F component, giving the AI more nuanced tools for adaptive Socratic learning while maintaining consistency with existing patterns and user experience.