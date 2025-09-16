import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { LEARNING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { detectUncertainty, generateMCQAction, generateTFAction } from '@/lib/ai/lesson-actions';
import { processLessonMaterials } from '@/lib/ai/gemini-files';
import { getCourseMaterialsByTopics } from '@/lib/supabase/materials';
import { createServerLessonManager } from '@/lib/supabase/lessons';
import { GoogleGenerativeAI, GoogleGenerativeAIError, ChatSession } from "@google/generative-ai";

export const runtime = 'edge';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LessonChatSession {
  lessonId: string;
  chatSession: ChatSession;
  documentsLoaded: boolean;
  lastActivity: Date;
  materialsContext: string;
  uploadedDocuments: Set<string>;
}

// Global session store for lesson-based chat sessions
const lessonChatSessions = new Map<string, LessonChatSession>();

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes (1 hour)
const MAX_CONCURRENT_SESSIONS = 50;

function isSessionExpired(session: LessonChatSession): boolean {
  const now = new Date();
  const sessionAge = now.getTime() - session.lastActivity.getTime();
  return sessionAge > SESSION_TIMEOUT;
}

async function getOrCreateLessonChatSession(lessonId: string, genAI: GoogleGenerativeAI): Promise<LessonChatSession> {
  let session = lessonChatSessions.get(lessonId);
  
  if (!session || isSessionExpired(session)) {
    // Clean up oldest session if we're at the limit
    if (lessonChatSessions.size >= MAX_CONCURRENT_SESSIONS) {
      const oldestSession = Array.from(lessonChatSessions.entries())
        .sort((a, b) => a[1].lastActivity.getTime() - b[1].lastActivity.getTime())[0];
      lessonChatSessions.delete(oldestSession[0]);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chatSession = model.startChat({
      generationConfig: { 
        temperature: 0.5, 
        topP: 0.8, 
        topK: 40, 
        maxOutputTokens: 65536 
      },
      history: [],
    });
    
    session = {
      lessonId,
      chatSession,
      documentsLoaded: false,
      lastActivity: new Date(),
      materialsContext: '',
      uploadedDocuments: new Set<string>()
    };
    
    lessonChatSessions.set(lessonId, session);
  }
  
  // Update activity timestamp
  session.lastActivity = new Date();
  return session;
}

async function initializeLessonSession(session: LessonChatSession, lessonId: string) {
  try {
    console.log('Initializing lesson session with documents for lesson:', lessonId);
    
    const lessonManager = await createServerLessonManager();
    const lesson = await lessonManager.getLesson(lessonId);
    
    if (!lesson || !lesson.course_id || !lesson.topic_selection) {
      console.log('No lesson context or materials available');
      session.documentsLoaded = true;
      return;
    }

    console.log('Processing lesson materials for course:', lesson.course_id, 'topics:', lesson.topic_selection);
    
    // Get materials based on course and topic selection
    const lessonMaterials = await getCourseMaterialsByTopics(lesson.course_id, lesson.topic_selection);
    
    if (lessonMaterials.length === 0) {
      console.log('No materials found for this lesson');
      session.documentsLoaded = true;
      return;
    }

    console.log(`Found ${lessonMaterials.length} materials for lesson context`);
    const materialResult = await processLessonMaterials(lessonMaterials);
    
    // Create enhanced system prompt with materials context
    const enhancedSystemPrompt = `${LEARNING_SYSTEM_PROMPT}

${materialResult.systemPromptAddition}

You have access to assessment tools that create interactive learning content:

1. **generateMCQ** - Creates multiple choice questions
2. **generateTF** - Creates True/False statements  

Use these tools when the user shows uncertainty or needs practice with the concepts covered in the provided materials.`;

    // Send enhanced system prompt first
    await session.chatSession.sendMessage([{ text: enhancedSystemPrompt }]);
    
    // If we have successfully processed materials with file URIs, send them as document attachments
    const documentParts: Array<{ text: string } | { fileData: { fileUri: string; mimeType: string } }> = [];
    
    materialResult.processedMaterials.filter(m => !m.error && m.uri).forEach(material => {
      console.log(`Adding document to session: ${material.name}`);
      documentParts.push({ text: `<Document: ${material.name}> Type: Course Material` });
      documentParts.push({ fileData: { fileUri: material.uri!, mimeType: material.mimeType } });
      documentParts.push({ text: `</Document>` });
      session.uploadedDocuments.add(material.uri!);
    });
    
    if (documentParts.length > 0) {
      // Send documents to establish context
      await session.chatSession.sendMessage(documentParts);
      console.log(`Successfully uploaded ${materialResult.processedMaterials.filter(m => !m.error && m.uri).length} documents to session`);
    }
    
    // Store materials context for reference
    session.materialsContext = materialResult.systemPromptAddition;
    session.documentsLoaded = true;
    
    console.log('Lesson session initialization complete');
  } catch (error) {
    console.error('Error initializing lesson session:', error);
    // Mark as loaded to prevent infinite retry loops
    session.documentsLoaded = true;
  }
}

// Fallback function for basic chat without persistent sessions (when no lessonId)
async function streamBasicChat(messages: Message[]) {
  console.log('Using basic chat without lesson context');
  
  // Process messages and handle initial context
  let processedMessages = [...messages];
  
  if (processedMessages.length === 0) {
    processedMessages = [
      {
        role: 'user' as const,
        content: "Hello! I'm ready to start learning."
      }
    ];
    console.log('Added default greeting message');
  }

  // Get the latest user message for uncertainty detection
  const latestUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
  const shouldTriggerAssessment = latestUserMessage ? await detectUncertainty(latestUserMessage.content) : false;

  console.log('Should trigger assessment:', shouldTriggerAssessment);

  const result = await streamText({
    model: google('gemini-2.5-flash-lite'),
    temperature: 0.5,
    topP: 0.8,
    topK: 40,
    messages: processedMessages,
    system: `${LEARNING_SYSTEM_PROMPT}

You have access to TWO assessment tools that create interactive learning content:

1. **generateMCQ** - Creates multiple choice questions
2. **generateTF** - Creates True/False statements  

## ASSESSMENT SELECTION STRATEGY:

**Use generateMCQ (PREFERRED) when:**
- Testing application of concepts with multiple valid approaches
- Choosing between different methods or solutions
- Comparing and contrasting multiple options
- Assessment of understanding across broader topics
- When both MCQ and T/F would work equally well (slight MCQ preference)

**Use generateTF when:**
- Clarifying common misconceptions  
- Verifying specific factual understanding
- Exploring nuanced aspects of a concept with subtle distinctions
- Addressing yes/no conceptual questions
- Breaking down complex topics into discrete true/false elements

## CRITICAL ASSESSMENT INSTRUCTIONS:
1. ALWAYS provide a contextual text explanation BEFORE generating any assessment
2. This explanation should either:
   - Provide a brief educational overview of the topic to guide the user toward understanding
   - Introduce the assessment with context about why it's being asked and how it applies
   - Give background information that will help the user approach the assessment thoughtfully

3. Your text response should stand alone as valuable educational content, even without the assessment
4. The explanation should prepare the user to engage meaningfully with the assessment

IMPORTANT: If the user's message contains uncertainty indicators like "don't understand", "confused", "not sure", "what is", "explain", etc., you SHOULD:
1. First provide a clear, contextual explanation of the topic
2. Then use either generateMCQ or generateTF tool to create practice content that builds on that explanation

Choose the assessment type that best serves the specific learning moment. When in doubt, prefer MCQ.`,
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
      })
    },
    toolChoice: 'auto',
    maxTokens: 1000,
    onStepFinish: (step) => {
      console.log('Step finished:', step.stepType);
    },
    onFinish: (result) => {
      console.log('Stream finished, text length:', result.text?.length || 0);
    }
  });

  return result.toDataStreamResponse();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, lessonId }: { messages: Message[]; lessonId?: string } = body;
    
    console.log('=== CHAT API CALLED ===');
    console.log('Received messages:', messages.length);
    console.log('Lesson ID:', lessonId);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
      return new Response(JSON.stringify({ error: 'Missing API key configuration' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If no lessonId, fall back to the basic streaming chat without persistent sessions
    if (!lessonId) {
      return streamBasicChat(messages);
    }

    // Use persistent session management with Google Gemini API for lessons
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const session = await getOrCreateLessonChatSession(lessonId, genAI);

    // Initialize session with lesson context and documents if not already done
    if (!session.documentsLoaded) {
      await initializeLessonSession(session, lessonId);
    }

    // Process the latest user message
    const latestUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const userMessage = latestUserMessage?.content || "Hello! I'm ready to start learning.";

    console.log('Sending message to persistent session:', userMessage.substring(0, 100) + '...');

    // Send the latest message to the persistent session
    const result = await session.chatSession.sendMessage(userMessage);
    
    // Update activity timestamp
    session.lastActivity = new Date();

    const responseText = result.response.text();
    console.log('Response from session:', responseText.substring(0, 100) + '...');

    // Return response as streaming-compatible format
    return new Response(JSON.stringify({ 
      content: responseText,
      sessionActive: true,
      documentsLoaded: session.documentsLoaded,
      materialsUploaded: session.uploadedDocuments.size 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof GoogleGenerativeAIError) {
      // Handle specific Google AI errors
      if (error.message?.includes('permission to access the File') || error.message?.includes('may not exist')) {
        return new Response(JSON.stringify({ 
          error: 'Failed to access one or more document files. The files may have expired or been deleted.', 
          originalError: error.message,
          isGoogleAIError: true
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
      
      if (error.message?.includes('Request payload size exceeds the limit')) {
        return new Response(JSON.stringify({
          error: 'Documents are too large to process. Try with fewer or smaller documents.',
          originalError: error.message,
          isGoogleAIError: true
        }), { status: 413, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Generic Google AI error
      return new Response(JSON.stringify({ 
        error: 'AI service error: ' + error.message, 
        originalError: error.message,
        isGoogleAIError: true
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}