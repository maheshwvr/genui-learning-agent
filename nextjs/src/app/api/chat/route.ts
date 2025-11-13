import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { LEARNING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { detectUncertainty, generateMCQAction, generateTFAction, generateFlashcardsAction } from '@/lib/ai/lesson-actions';
import { processLessonMaterialsWithUpload } from '@/lib/ai/gemini-files';
import { getCourseMaterialsByTopics } from '@/lib/supabase/materials';
import { createServerLessonManager } from '@/lib/supabase/lessons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI, createPartFromUri } from '@google/genai';

export const runtime = 'edge';

// Request deduplication map - using lesson ID as primary key
const requestMap = new Map<string, { timestamp: number; promise: Promise<Response>; processing: boolean }>();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Function to handle streaming with files using native Google GenAI SDK
async function streamNativeWithFiles(
  messages: Message[], 
  systemPrompt: string, 
  materialFileData: Array<{ fileUri: string; mimeType: string }>,
  shouldTriggerAssessment: boolean,
  latestUserMessage: Message | undefined,
  originalMessages: Message[]
) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Google Generative AI API key');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Prepare content with files using createPartFromUri
    const content: any[] = [];
    
    // Add system prompt and user message
    const userMessage = messages.filter(m => m.role === 'user').pop();
    const userContent = userMessage ? userMessage.content : "Hello! I'm ready to start learning with the uploaded materials.";
    
    // Combine system prompt with user message
    content.push(`${systemPrompt}\n\nUser: ${userContent}\n\nPlease analyze the uploaded course materials and provide a helpful response.`);
    
    // Add files using createPartFromUri
    materialFileData.forEach(fileData => {
      const filePart = createPartFromUri(fileData.fileUri, fileData.mimeType);
      content.push(filePart);
    });

    console.log(`Generating content with ${materialFileData.length} files using GoogleGenAI`);

    // Use GoogleGenAI to generate content with files
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: content,
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('No response text generated');
    }
    
    console.log('Generated response with file content:', responseText.substring(0, 200) + '...');

    // Create a mock streamText result to be compatible with useChat
    const mockStreamResult = {
      toDataStreamResponse: () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            try {
              // Send the complete response as a single chunk in AI SDK format
              const textChunk = `0:"${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
              controller.enqueue(encoder.encode(textChunk));
              controller.close();
            } catch (error) {
              console.error('Error creating mock stream:', error);
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Vercel-AI-Data-Stream': 'v1',
          },
        });
      }
    };

    return mockStreamResult.toDataStreamResponse();

  } catch (error: any) {
    console.error('Error with GoogleGenAI file processing:', error);
    
    // If it's a permission error (403), it might be due to expired/invalid file URIs
    if (error.status === 403 || error.message?.includes('permission') || error.message?.includes('PERMISSION_DENIED')) {
      console.log('Permission error detected - this might be due to expired cached file URIs. The system will automatically re-upload files in the next request.');
    }
    
    // Fall back to regular AI SDK without files
    console.log('Falling back to AI SDK without files...');
    
    // Create a fresh streamText result without files
    const fallbackResult = await streamText({
      model: google('gemini-2.5-flash-lite'),
      temperature: 0.5,
      topP: 0.8,
      topK: 40,
      messages: messages,
      system: systemPrompt,
    });

    return fallbackResult.toDataStreamResponse();
  }
}

// Fresh chat function - no persistence, each request is independent
async function streamFreshChat(messages: Message[], lessonId?: string) {
  // Process messages and handle initial context
  let processedMessages = [...messages];
  let systemPrompt = LEARNING_SYSTEM_PROMPT;
  let materialFileData: Array<{ fileUri: string; mimeType: string }> = [];
  
  // Filter out special context messages that shouldn't be sent to the AI
  processedMessages = processedMessages.filter(msg => 
    !(msg.role === 'user' && msg.content === '__INITIAL_CONTEXT_MESSAGE__')
  );
  
  // Only load materials once per conversation - check if any previous assistant messages already have material context
  const hasAssistantResponses = messages.some(msg => msg.role === 'assistant');
  const shouldLoadMaterials = lessonId && !hasAssistantResponses;
  
  if (shouldLoadMaterials) {
    try {
      const lessonManager = await createServerLessonManager();
      const lesson = await lessonManager.getLesson(lessonId);
      
      if (lesson && lesson.course_id && Array.isArray(lesson.topic_selection)) {
        // Get materials based on course and topic selection
        const lessonMaterials = await getCourseMaterialsByTopics(lesson.course_id, lesson.topic_selection);
        
        if (lessonMaterials.length > 0) {
          // Process materials but don't persist them
          const materialResult = await processLessonMaterialsWithUpload(lessonMaterials);
          
          // Store the file URIs for the model
          materialFileData = materialResult.materialFileData;
          
          // Add materials context to system prompt for this request only
          let materialsContext = '\n\nCourse Materials for this session:\n';
          materialResult.processedMaterials.filter(m => !m.error).forEach(material => {
            const sizeInfo = material.fileSize ? ` (${(material.fileSize / 1024).toFixed(1)} KB)` : '';
            materialsContext += `- ${material.name} (${material.mimeType})${sizeInfo}\n`;
          });
          
          systemPrompt += materialsContext + '\n\nUse these materials to provide contextual, relevant learning guidance. Start each conversation fresh without assuming prior context from previous sessions. When users are presented with topic options, acknowledge their choice warmly and briefly before diving into the selected topic. Keep initial responses concise and focused on what the user specifically wants to learn.';
        }
      }
    } catch (error) {
      console.error('Error loading course materials:', error);
      // Continue without materials if there's an error
    }
  }

  // Add default greeting if no messages
  if (processedMessages.length === 0) {
    let greetingContent = "Hello! What would you like to focus on in this lesson?";
    
    // If we have materials and topic selection, list the available topics
    if (shouldLoadMaterials) {
      try {
        const lessonManager = await createServerLessonManager();
        const lesson = await lessonManager.getLesson(lessonId);
        
        if (lesson && lesson.course_id && Array.isArray(lesson.topic_selection) && lesson.topic_selection.length > 0) {
          const topicsList = lesson.topic_selection.map((topic, index) => `${index + 1}. ${topic}`).join('\n');
          greetingContent = `Hello! I have materials covering these topics:\n\n${topicsList}\n\nWhich topic would you like to focus on first?`;
        }
      } catch (error) {
        console.error('Error loading lesson for greeting:', error);
        // Fall back to default greeting
      }
    }
    
    processedMessages = [
      {
        role: 'user' as const,
        content: greetingContent
      }
    ];
  }

  // Add uploaded files reference to the conversation
  if (materialFileData.length > 0 && processedMessages.length > 0) {
    // Find the first user message and modify it to include file references
    const firstUserMessageIndex = processedMessages.findIndex(m => m.role === 'user');
    if (firstUserMessageIndex !== -1) {
      const firstUserMessage = processedMessages[firstUserMessageIndex];
      
      // Add explicit file URIs that Gemini can access
      const fileInstructions = materialFileData.map((fileData, index) => 
        `File ${index + 1}: ${fileData.fileUri} (${fileData.mimeType})`
      ).join('\n');
      
      processedMessages[firstUserMessageIndex] = {
        ...firstUserMessage,
        content: `${firstUserMessage.content}

SYSTEM: Access these uploaded Google File API URIs for course content analysis:
${fileInstructions}

Please analyze the content from these files when answering questions about the course material.`
      };
      
      console.log(`Added ${materialFileData.length} file URIs to first user message`);
    }
  }

  // Get the latest user message for uncertainty detection
  const latestUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
  const shouldTriggerAssessment = latestUserMessage ? await detectUncertainty(latestUserMessage.content) : false;

  console.log('Should trigger assessment:', shouldTriggerAssessment);

  // If we have uploaded files, use the native Google Generative AI SDK for proper file support
  if (materialFileData.length > 0) {
    console.log(`Using native Google AI SDK for conversation with ${materialFileData.length} files`);
    return await streamNativeWithFiles(processedMessages, systemPrompt, materialFileData, shouldTriggerAssessment, latestUserMessage, messages);
  }

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    temperature: 0.4,
    topP: 0.7,
    topK: 30,
    messages: processedMessages,
    system: `${systemPrompt}

${materialFileData.length > 0 ? `
IMPORTANT: You have access to ${materialFileData.length} uploaded files containing course materials. These files have been uploaded to the Google File API and are available for analysis. The file URIs are included in the user's message. When users ask questions about the course content, you should analyze and reference the specific content from these uploaded files.

Files available:
${materialFileData.map((file, i) => `${i + 1}. URI: ${file.fileUri} (${file.mimeType})`).join('\n')}

These are Google File API URIs that you can access directly. Use the content from these files to provide accurate, contextual responses about the course material.
` : ''}

You have access to THREE assessment tools that create interactive learning content:

1. **generateMCQ** - Creates multiple choice questions
2. **generateTF** - Creates True/False statements  
3. **generateFlashcards** - Creates flashcards for active recall and retention

## CRITICAL: Assessment Generation Rules

**NEVER write assessment questions directly in your response text.** You must ONLY create assessments by calling the appropriate tool functions listed above.

**PROHIBITED EXAMPLES (DO NOT DO THIS):**
❌ "True or False: An engineer should always strive to make as many idealizations..."
❌ "Which of the following is correct? A) Option 1 B) Option 2..."
❌ "Here's a quick quiz question: What is...?"

**CORRECT APPROACH:**
✅ Provide educational explanation, then call generateMCQ/generateTF/generateFlashcards tool
✅ Let the tool handle the assessment creation and display
✅ Focus your text response on explanations and context

## ASSESSMENT SELECTION STRATEGY:

**Use generateMCQ (PREFERRED) when:**
- Testing application of concepts with multiple valid approaches
- Choosing between different methods or solutions
- Comparing and contrasting multiple options
- Assessment of understanding across broader topics
- When multiple tools would work equally well (slight preference)

**Use generateTF when:**
- Clarifying common misconceptions  
- Verifying specific factual understanding
- Exploring nuanced aspects of a concept with subtle distinctions
- Addressing yes/no conceptual questions
- Breaking down complex topics into discrete true/false elements

**Use generateFlashcards (PREFERRED) when:**
- Testing memorization of key terms and definitions
- Reinforcing core concepts from lesson materials for retention
- Supporting spaced repetition and active recall
- Consolidating learned material for long-term memory
- When user explicitly mentions memorization, recall, or review needs
- After substantial material has been covered and needs consolidation
- When multiple tools would work equally well (slight preference)

## CRITICAL ASSESSMENT INSTRUCTIONS:
1. ALWAYS provide a contextual text explanation BEFORE calling any assessment tool
2. This explanation should either:
   - Provide a brief educational overview of the topic to guide the user toward understanding
   - Introduce why the assessment is important and how it applies to their learning
   - Give background information that will help the user approach the assessment thoughtfully

3. Your text response should stand alone as valuable educational content, even without the assessment
4. The explanation should prepare the user to engage meaningfully with the assessment
5. **NEVER include assessment questions in your text response - only call the tools**

## Tool Usage Workflow:
1. **First**: Provide educational context and explanation in your text response
2. **Then**: Call the appropriate tool (generateMCQ, generateTF, or generateFlashcards)
3. **Never**: Include assessment questions directly in your response text

IMPORTANT: If the user's message contains uncertainty indicators like "don't understand", "confused", "not sure", "what is", "explain", etc., you SHOULD:
1. First provide a clear, contextual explanation of the topic
2. Then use either generateMCQ, generateTF, or generateFlashcards tool to create practice content that builds on that explanation

Choose the assessment type that best serves the specific learning moment. When in doubt, prefer MCQ for application testing, T/F for misconception clarification, and Flashcards for retention and memorization.

REMEMBER: This is a fresh conversation with no previous context. Introduce topics clearly and don't assume the user knows what was discussed before.`,
    tools: {
      generateMCQ: tool({
        description: 'Generate a multiple choice question to help reinforce learning and test understanding',
        parameters: z.object({
          topic: z.string().describe('The main topic for the MCQ'),
          difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
          reason: z.string().describe('Why this MCQ would be helpful')
        }),
        execute: async ({ topic, difficulty, reason }) => {
          console.log('MCQ Tool called! Topic:', topic, 'Difficulty:', difficulty, 'Reason:', reason);
          
          try {
            const mcq = await generateMCQAction({
              topic,
              difficulty,
              context: messages.slice(-3).map((m: Message) => m.content).join('\n'),
              userMessage: latestUserMessage?.content || ''
            });

            if (mcq) {
              return {
                type: 'mcq',
                data: mcq,
                message: `I've created a quick quiz question to help reinforce your understanding of ${topic}:`
              };
            } else {
              return {
                type: 'error',
                message: 'I had trouble creating a quiz question, but let\'s continue our discussion!'
              };
            }
          } catch (error) {
            console.error('Error generating MCQ:', error);
            return {
              type: 'error', 
              message: 'I had trouble creating a quiz question, but let\'s continue our discussion!'
            };
          }
        }
      }),
      generateTF: tool({
        description: 'Generate True/False statements to clarify misconceptions and explore nuanced understanding',
        parameters: z.object({
          topic: z.string().describe('The main topic for the T/F statements'),
          difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
          reason: z.string().describe('Why these T/F statements would be helpful')
        }),
        execute: async ({ topic, difficulty, reason }) => {
          console.log('T/F Tool called! Topic:', topic, 'Difficulty:', difficulty, 'Reason:', reason);
          
          try {
            const tf = await generateTFAction({
              topic,
              difficulty,
              context: messages.slice(-3).map((m: Message) => m.content).join('\n'),
              userMessage: latestUserMessage?.content || ''
            });

            if (tf) {
              return {
                type: 'tf',
                data: tf,
                message: `Let's explore some key aspects of ${topic} through these True/False statements:`
              };
            } else {
              return {
                type: 'error',
                message: 'I had trouble creating True/False statements, but let\'s continue our discussion!'
              };
            }
          } catch (error) {
            console.error('Error generating T/F:', error);
            return {
              type: 'error',
              message: 'I had trouble creating True/False statements, but let\'s continue our discussion!'
            };
          }
        }
      }),
      generateFlashcards: tool({
        description: 'Generate flashcards for active recall and spaced repetition learning',
        parameters: z.object({
          topic: z.string().describe('The main topic for the flashcards'),
          difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),
          reason: z.string().describe('Why these flashcards would be helpful for retention')
        }),
        execute: async ({ topic, difficulty, reason }) => {
          console.log('Flashcards Tool called! Topic:', topic, 'Difficulty:', difficulty, 'Reason:', reason);
          
          try {
            const flashcardSet = await generateFlashcardsAction({
              topic,
              difficulty,
              context: messages.slice(-3).map((m: Message) => m.content).join('\n'),
              userMessage: latestUserMessage?.content || '',
              materialContext: materialFileData.length > 0 ? 
                `Materials available: ${materialFileData.map(f => f.fileUri).join(', ')}` : 
                undefined
            });

            if (flashcardSet) {
              return {
                type: 'flashcards',
                data: flashcardSet,
                message: `Let's reinforce these key concepts from ${topic} with some flashcards:`
              };
            } else {
              return {
                type: 'error',
                message: 'I had trouble creating flashcards, but let\'s continue our discussion!'
              };
            }
          } catch (error) {
            console.error('Error generating flashcards:', error);
            return {
              type: 'error',
              message: 'I had trouble creating flashcards, but let\'s continue our discussion!'
            };
          }
        }
      })
    },
    toolChoice: 'auto',
    maxTokens: 1000
  });

  return result.toDataStreamResponse();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, lessonId }: { messages: Message[]; lessonId?: string } = body;

    // Create a unique key based primarily on lesson ID to catch rapid duplicates
    const requestKey = lessonId || 'no-lesson';
    
    // Check for duplicate requests for this lesson within 10 seconds
    const existing = requestMap.get(requestKey);
    const now = Date.now();
    if (existing && (now - existing.timestamp) < 10000) {
      console.log('⚠️  DUPLICATE REQUEST DETECTED for lesson:', requestKey, '- returning existing promise');
      return existing.promise;
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
      return new Response(JSON.stringify({ error: 'Missing API key configuration' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create and store the promise for this request
    const responsePromise = streamFreshChat(messages, lessonId).finally(() => {
      // Mark this request as completed
      const entry = requestMap.get(requestKey);
      if (entry) {
        entry.processing = false;
      }
    });
    requestMap.set(requestKey, { timestamp: now, promise: responsePromise, processing: true });
    
    // Clean up old entries (older than 15 seconds)
    for (const [key, entry] of requestMap.entries()) {
      if (now - entry.timestamp > 15000) {
        requestMap.delete(key);
      }
    }

    // Always use fresh chat - no persistence regardless of lessonId
    return responsePromise;

  } catch (error) {
    console.error('API Error:', error);
    
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}