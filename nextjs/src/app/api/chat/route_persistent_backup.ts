import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { LEARNING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { detectUncertainty, generateMCQAction, generateTFAction } from '@/lib/ai/lesson-actions';
import { processLessonMaterialsWithUpload } from '@/lib/ai/gemini-files';
import { getCourseMaterialsByTopics } from '@/lib/supabase/materials';
import { createServerLessonManager } from '@/lib/supabase/lessons';

export const runtime = 'edge';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Fresh chat function - no persistence, each request is independent
async function streamFreshChat(messages: Message[], lessonId?: string) {
  console.log('=== FRESH CHAT SESSION ===');
  console.log('Processing fresh chat session');
  console.log('Lesson ID:', lessonId);
  console.log('Messages count:', messages.length);

  // Process messages and handle initial context
  let processedMessages = [...messages];
  let systemPrompt = LEARNING_SYSTEM_PROMPT;
  
  // If we have a lessonId, get the course materials for context (but no persistence)
  if (lessonId) {
    try {
      const lessonManager = await createServerLessonManager();
      const lesson = await lessonManager.getLesson(lessonId);
      
      if (lesson && lesson.course_id && Array.isArray(lesson.topic_selection)) {
        console.log('Loading course materials for fresh session');
        console.log('Course:', lesson.course_id, 'Topics:', lesson.topic_selection);
        
        // Get materials based on course and topic selection
        const lessonMaterials = await getCourseMaterialsByTopics(lesson.course_id, lesson.topic_selection);
        
        if (lessonMaterials.length > 0) {
          console.log(`Found ${lessonMaterials.length} materials for context`);
          
          // Process materials but don't persist them
          const materialResult = await processLessonMaterialsWithUpload(lessonMaterials);
          
          // Add materials context to system prompt for this request only
          let materialsContext = '\n\nCourse Materials for this session:\n';
          materialResult.processedMaterials.filter(m => !m.error).forEach(material => {
            const sizeInfo = material.fileSize ? ` (${(material.fileSize / 1024).toFixed(1)} KB)` : '';
            materialsContext += `- ${material.name} (${material.mimeType})${sizeInfo}\n`;
          });
          
          systemPrompt += materialsContext + '\n\nUse these materials to provide contextual, relevant learning guidance. Start each conversation fresh without assuming prior context from previous sessions.';
        }
      }
    } catch (error) {
      console.error('Error loading course materials:', error);
      // Continue without materials if there's an error
    }
  }

  // Add default greeting if no messages
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
    system: `${systemPrompt}

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

Choose the assessment type that best serves the specific learning moment. When in doubt, prefer MCQ.

REMEMBER: This is a fresh conversation with no previous context. Introduce topics clearly and don't assume the user knows what was discussed before.`,
    }

    console.log('Processing lesson materials for course:', lesson.course_id, 'topics:', lesson.topic_selection);
    
    // Get materials based on course and topic selection
    const lessonMaterials = await getCourseMaterialsByTopics(lesson.course_id, lesson.topic_selection);
    
    if (lessonMaterials.length === 0) {
      console.log('No materials found for this lesson');
      session.documentsLoaded = true;
      return null;
    }

    console.log(`Found ${lessonMaterials.length} materials for lesson context`);
    const materialResult = await processLessonMaterialsWithUpload(lessonMaterials);
    
    // Send basic system prompt (without materials context)
    const basicSystemPrompt = `${LEARNING_SYSTEM_PROMPT}

You have access to assessment tools that create interactive learning content:

1. **generateMCQ** - Creates multiple choice questions
2. **generateTF** - Creates True/False statements  

Use these tools when the user shows uncertainty or needs practice with the concepts covered in the provided materials.`;

    // Send basic system prompt first
    await session.chatSession.sendMessage([{ text: basicSystemPrompt }]);
    
    // Prepare materials context message that will be sent as user message
    let materialsContextMessage = `I'm starting a new learning session. Here are the course materials I'd like to study:\n\n`;
    
    materialResult.processedMaterials.filter(m => !m.error).forEach(material => {
      const sizeInfo = material.fileSize ? ` (${(material.fileSize / 1024).toFixed(1)} KB)` : '';
      materialsContextMessage += `- ${material.name} (${material.mimeType})${sizeInfo}\n`;
    });
    
    materialsContextMessage += `\nPlease review these materials and introduce me to the key topics we'll be covering. Start with an overview and then ask me a question to gauge my current understanding.`;
    
    // Store materials context and materials data for use when sending the initial message
    session.materialsContext = materialsContextMessage;
    session.documentsLoaded = true;
    
    // Return the processed materials for document attachment
    return materialResult;
    
  } catch (error) {
    console.error('Error initializing lesson session:', error);
    // Mark as loaded to prevent infinite retry loops
    session.documentsLoaded = true;
    return null;
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

    // Process the latest user message
    const latestUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const userMessage = latestUserMessage?.content || "Hello! I'm ready to start learning.";

    console.log('Sending message to persistent session:', userMessage.substring(0, 100) + '...');

    // Handle initial context message specially
    if (userMessage === "__INITIAL_CONTEXT_MESSAGE__" && !session.documentsLoaded) {
      console.log('Processing initial context message with materials');
      
      // Initialize session and get materials
      const materialResult = await initializeLessonSession(session, lessonId);
      
      if (materialResult && session.materialsContext) {
        // Prepare message with documents attached
        const documentParts: Array<{ text: string } | { fileData: { fileUri: string; mimeType: string } }> = [];
        
        // Add the context message
        documentParts.push({ text: session.materialsContext });
        
        // Add document attachments
        materialResult.processedMaterials.filter(m => !m.error && m.uri).forEach(material => {
          console.log(`Adding document to initial message: ${material.name}`);
          documentParts.push({ fileData: { fileUri: material.uri!, mimeType: material.mimeType } });
          session.uploadedDocuments.add(material.uri!);
        });
        
        // Send context message with documents
        const result = await session.chatSession.sendMessage(documentParts);
        session.lastActivity = new Date();
        
        const responseText = result.response.text();
        console.log('Initial response from session:', responseText.substring(0, 100) + '...');
        
        // Return the response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            try {
              const chunk = `0:"${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
              controller.enqueue(encoder.encode(chunk));
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Session-Active': 'true',
            'X-Documents-Loaded': 'true',
            'X-Materials-Uploaded': session.uploadedDocuments.size.toString()
          }
        });
      } else {
        // No materials found, proceed with basic greeting
        const result = await session.chatSession.sendMessage("Hello! I'm ready to start learning.");
        session.lastActivity = new Date();
        
        const responseText = result.response.text();
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            try {
              const chunk = `0:"${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
              controller.enqueue(encoder.encode(chunk));
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Session-Active': 'true',
            'X-Documents-Loaded': 'true',
            'X-Materials-Uploaded': '0'
          }
        });
      }
    }

    // For regular messages, ensure session is initialized
    if (!session.documentsLoaded) {
      await initializeLessonSession(session, lessonId);
    }

    // Send the regular message to the persistent session
    const result = await session.chatSession.sendMessage(userMessage);
    
    // Update activity timestamp
    session.lastActivity = new Date();

    const responseText = result.response.text();
    console.log('Response from session:', responseText.substring(0, 100) + '...');

    // Convert the Gemini response to AI SDK compatible streaming format
    // Create a simple streaming response that mimics the AI SDK format
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Send the text content in AI SDK streaming format
          const chunk = `0:"${responseText.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
          controller.enqueue(encoder.encode(chunk));
          
          // Close the stream
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Session-Active': 'true',
        'X-Documents-Loaded': session.documentsLoaded.toString(),
        'X-Materials-Uploaded': session.uploadedDocuments.size.toString()
      }
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