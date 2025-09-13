
## Guide: Building Interactive AI Lessons with Vercel AI SDK

Hello! This guide will walk you through creating dynamic, interactive educational content using the Vercel AI SDK.

Our goal is to have an AI tutor that can not only talk to a user but also generate interactive UI elements like quizzes and checklists directly within the conversation.

We will move from a manual XML-based system to the SDK'''s more powerful and type-safe `generateUI` feature.

### The Big Idea: From XML Tags to Typed UI Components

Your current system prompt is excellent because it understands a critical concept: the AI needs to send structured commands, not just text. The prompt tells the AI to output `<quiz>` and `<criteria_unlocked>` tags. The frontend would then have to manually parse this XML and render the right UI.

**The New Way:** Instead of inventing our own XML format, we'''ll use the Vercel AI SDK'''s built-in "tools" system.

1. **We define the *shape* of our UI components** using a schema library called Zod. (e.g., "a quiz must have a `question` string and an array of `statements`").
2. **We create the React components** that can render this data (e.g., a `<QuizComponent />`).
3. **We tell the AI about these "tools."** The AI can then decide to "call" our quiz tool, providing the data (the question and statements) in a structured JSON format that perfectly matches our schema.
4. **The SDK automatically renders our React component** with the data from the AI.

This is better because it'''s **type-safe**, less error-prone than parsing strings, and integrates directly into our React codebase.

---

### Step 1: Define the UI "Schema" with Zod

First, we define the data structure for our interactive components. Think of this as the new "Function Definition" section of your prompt. We'''ll use Zod to create these schemas.

The `.describe()` method is very important, as it provides hints to the AI on what each field is for.

**Snippet:** `src/libs/components/ai/lesson-schemas.ts`

```tsx
import { z } from '''zod''';

// Schema for a True/False quiz
export const quizSchema = z.object({
    question: z.string().describe("The overarching question for the quiz."),
    statements: z.array(
    z.object({
        text: z.string().describe("The statement to be evaluated as true or false."),
        correct: z.boolean().describe("Whether this statement is true or false."),
    })
    ).describe("A list of statements for the user to evaluate."),
});

// Schema for updating the lesson checklist
export const criteriaUnlockedSchema = z.object({
    id: z.string().describe("The unique ID of the learning criteria that was met."),
    label: z.string().describe("The human-readable label for the criteria."),
});
```

### Step 2: Create the React Components

These are the actual UI components that will be rendered when the AI returns data matching our schemas. They are just standard React components that receive props.

**Snippet:** `src/libs/components/ai/lesson-components.tsx`

```tsx
"use client";

import { z } from "zod";
import { quizSchema, criteriaUnlockedSchema } from '''./lesson-schemas''';

// A component to render the quiz
export function Quiz({ question, statements }: z.infer<typeof quizSchema>) {
    // ... (UI and state for handling answers)
    return (
    <div className="p-4 my-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold">{question}</h3>
        {/* Map over statements and render buttons for True/False */}
    </div>
    );
}

// A component to show a "Criteria Unlocked" notification
export function CriteriaUnlocked({ id, label }: z.infer<typeof criteriaUnlockedSchema>) {
    return (
    <div className="p-3 my-4 rounded-lg bg-green-100 text-green-800">
        <strong>✅ Criteria Unlocked:</strong> {label}
    </div>
    );
}
```

### Step 3: Update the System Prompt

Now, we update the system prompt. We'''ll remove the XML instructions and tell the AI to use the new "tools" we'''ve defined.

**Your OLD Prompt Section:**

```tsx
<Function Definitions and Usage>
...
1. Real-time Quizzes: <quiz>
...
Format:
<quiz type="true_false">
    <question>Are the following statements true or false?</question>
    <statement correct="true">TEXT OF THE FIRST STATEMENT.</statement>
</quiz>
...
</Function Definitions and Usage>
```

**The NEW Prompt Section:**

```tsx
<Tool Definitions and Usage>

You have access to the following tools to create an interactive learning experience. You must call these tools when appropriate by providing a JSON object that matches the specified schema.

1. `generate_quiz`
    - **Purpose**: To create a quick knowledge check after you have explained a concept.
    - **When to Call**: Call this function immediately after providing an explanation because the user'''s answer was incorrect or they said "I don'''t know."
    - **Parameters**:
        - `question` (string): The main question for the quiz.
        - `statements` (array of objects): A list of statements, each with:
        - `text` (string): The statement to evaluate.
        - `correct` (boolean): Whether the statement is true or false.

2. `unlock_criteria`
    - **Purpose**: To signal that the user has mastered a learning objective.
    - **When to Call**: Call this after the user correctly answers a key question that proves their understanding of a concept from the HYPERTENSION_CRITERIA list.
    - **Parameters**:
        - `id` (string): The unique ID from the HYPERTENSION_CRITERIA list (e.g., "DEFINE_HYPERTENSION").
        - `label` (string): The human-readable text of the criteria.

</Tool Definitions and Usage>
```

By telling the AI to use the `generate_quiz` tool, it will know to provide a JSON object that we can map to our `Quiz` component.

### Step 4: The Server Action with `generateUI`

This is the heart of the operation. We create a Next.js Server Action that takes the conversation history and calls the Vercel AI SDK'''s `generateUI` function.

Here, we link our schemas (`quizSchema`) to our React components (`Quiz`).

**Snippet:** `src/app/actions.ts`

```tsx
'''use server''';

import { generateUI } from '''ai/rsc''';
import { openai } from '''@ai-sdk/openai''';
import { z } from '''zod''';
import { Quiz, CriteriaUnlocked } from '''@/libs/components/ai/lesson-components''';
import { quizSchema, criteriaUnlockedSchema } from '''@/libs/components/ai/lesson-schemas''';

// ... (get the system prompt from a file)

export async function continueConversation(messages: CoreMessage[]) {
    const result = await generateUI({
    model: openai('''gpt-4-turbo'''),
    // The system prompt now instructs the AI to use tools
    system: getSystemPrompt(),
    messages,
    // The "tools" are our schemas mapped to our components
    tools: {
        generate_quiz: {
        schema: quizSchema,
        render: async function* (props) {
            // You can add a loading state here if you want
            yield <div>Loading quiz...</div>;
            // Return the component to be rendered on the client
            return <Quiz {...props} />;
        },
        },
        unlock_criteria: {
        schema: criteriaUnlockedSchema,
        render: async function* (props) {
            return <CriteriaUnlocked {...props} />;
        }
        }
    },
    });

    return result;
}
```

### Step 5: The Client-Side Page

Finally, the client-side code uses hooks from the Vercel AI SDK (`useUIState`, `useActions`) to manage the conversation state and render the AI'''s response, which now includes our interactive components.

**Snippet:** `src/app/[locale]/(home)/lesson/page.tsx`

```tsx
'''use client''';

import { useUIState, useActions } from '''ai/rsc''';
import { type AI } from '''./actions'''; // The types from our server action

export default function LessonPage() {
    const [messages, setMessages] = useUIState<typeof AI>();
    const { continueConversation } = useActions<typeof AI>();

    return (
    <div>
        {/* Render the conversation history */}
        {messages.map((message) => (
        <div key={message.id}>
            {message.display}
        </div>
        ))}

        <form
        onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            // Add the user'''s message to the state
            setMessages(currentMessages => [
            ...currentMessages,
            { id: Date.now().toString(), display: <div>{formData.get('''input''')}</div>, role: '''user''' },
            ]);
            // Call the server action
            const aiResponse = await continueConversation([
            ...messages,
            // ... create the new user message object
            ]);
            // Add the AI'''s response (which could be text or our components)
            setMessages(currentMessages => [...currentMessages, aiResponse]);
        }}
        >
        <input name="input" placeholder="Your answer..." />
        <button type="submit">Send</button>
        </form>
    </div>
    );
}
```

This setup provides a robust, maintainable, and powerful way to build generative UI experiences. The AI handles the *what* and *when* (e.g., "ask a quiz now about hypertension"), and our code handles the *how* (rendering a beautiful, interactive quiz component).