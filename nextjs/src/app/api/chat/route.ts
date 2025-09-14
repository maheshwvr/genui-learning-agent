import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { LEARNING_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { detectUncertainty, generateMCQAction } from '@/lib/ai/lesson-actions';

export const runtime = 'edge';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: Message[] } = await req.json();
    
    console.log('Received messages:', messages);
    console.log('API Key exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    // Get the latest user message for uncertainty detection
    const latestUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const shouldTriggerMCQ = latestUserMessage ? await detectUncertainty(latestUserMessage.content) : false;

    console.log('Should trigger MCQ:', shouldTriggerMCQ);
    console.log('Latest user message:', latestUserMessage?.content);
    console.log('Messages count:', messages.length);

    const result = await streamText({
      model: google('gemini-2.5-flash-lite'),
      messages,
      system: `${LEARNING_SYSTEM_PROMPT}

You have access to a generateMCQ tool that creates multiple choice questions. Use this tool when:
- The user seems uncertain, confused, or asks "I don't understand"
- After explaining complex concepts that would benefit from practice questions
- When a user asks questions indicating they need reinforcement

IMPORTANT: If the user's message contains uncertainty indicators like "don't understand", "confused", "not sure", "what is", "explain", etc., you SHOULD use the generateMCQ tool after providing your explanation.

Example usage: If user says "I don't understand photosynthesis", first explain photosynthesis, then call generateMCQ with topic="photosynthesis" to create a practice question.`,
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
                // Return a marker that can be easily found and parsed
                const mcqMarker = `MCQ_DATA_START${JSON.stringify(mcq)}MCQ_DATA_END`;
                return `I've created a quick quiz question to help reinforce your understanding of ${topic}:\n\n${mcqMarker}`;
              } else {
                return 'I had trouble creating a quiz question, but let\'s continue our discussion!';
              }
            } catch (error) {
              console.error('Error generating MCQ:', error);
              return 'I had trouble creating a quiz question, but let\'s continue our discussion!';
            }
          }
        })
      },
      toolChoice: 'auto',
      maxTokens: 1000,
    });

    console.log('Streaming response created');
    
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
