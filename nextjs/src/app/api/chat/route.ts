import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { LEARNING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { detectUncertainty, generateMCQAction, generateTFAction } from '@/lib/ai/lesson-actions';
import { processLessonMaterials } from '@/lib/ai/gemini-files';
import { getCourseMaterialsByTopics } from '@/lib/supabase/materials';
import { createServerLessonManager } from '@/lib/supabase/lessons';

export const runtime = 'edge';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, lessonId }: { messages: Message[]; lessonId?: string } = body;
    
    console.log('Received messages:', messages);
    console.log('Lesson ID:', lessonId);
    console.log('API Key exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    // Get lesson context if lessonId is provided
    let materialsSystemPrompt = ''
    let lessonMaterials: any[] = []
    
    if (lessonId) {
      try {
        const lessonManager = await createServerLessonManager()
        const lesson = await lessonManager.getLesson(lessonId)
        
        if (lesson && lesson.course_id && lesson.topic_selection) {
          console.log('Processing lesson materials for course:', lesson.course_id, 'topics:', lesson.topic_selection)
          
          // Get materials based on course and topic selection
          lessonMaterials = await getCourseMaterialsByTopics(lesson.course_id, lesson.topic_selection)
          
          if (lessonMaterials.length > 0) {
            console.log(`Found ${lessonMaterials.length} materials for lesson context`)
            const materialResult = await processLessonMaterials(lessonMaterials)
            materialsSystemPrompt = materialResult.systemPromptAddition
            
            console.log('Materials system prompt addition:', materialsSystemPrompt.substring(0, 200) + '...')
          }
        }
      } catch (error) {
        console.error('Error processing lesson materials:', error)
        // Continue without materials if there's an error
      }
    }

    // Get the latest user message for uncertainty detection
    const latestUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const shouldTriggerAssessment = latestUserMessage ? await detectUncertainty(latestUserMessage.content) : false;

    console.log('Should trigger assessment:', shouldTriggerAssessment);
    console.log('Latest user message:', latestUserMessage?.content);
    console.log('Messages count:', messages.length);

    const result = await streamText({
      model: google('gemini-2.5-flash-lite'),
      temperature: 0.5,
      topP: 0.8,
      topK: 40,
      messages,
      system: `${LEARNING_SYSTEM_PROMPT}${materialsSystemPrompt}

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
                // Return the structured data directly - AI SDK will handle tool invocation structure
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
                // Return the structured data directly - AI SDK will handle tool invocation structure
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

    console.log('Streaming response created, returning to client');
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
