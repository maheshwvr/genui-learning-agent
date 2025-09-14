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

CRITICAL MCQ INSTRUCTIONS:
1. ALWAYS provide a contextual text explanation BEFORE generating any MCQ
2. This explanation should either:
   - Provide a brief educational overview of the topic to guide the user toward understanding
   - Introduce the question with context about why it's being asked and how it applies
   - Give background information that will help the user approach the question thoughtfully

3. Your text response should stand alone as valuable educational content, even without the MCQ
4. The explanation should prepare the user to engage meaningfully with the question

IMPORTANT: If the user's message contains uncertainty indicators like "don't understand", "confused", "not sure", "what is", "explain", etc., you SHOULD:
1. First provide a clear, contextual explanation of the topic
2. Then use the generateMCQ tool to create a practice question that builds on that explanation

Example usage: If user says "I don't understand photosynthesis":
1. Provide text: "Photosynthesis is the process by which plants convert sunlight into energy. Let me break this down: plants use chlorophyll to capture light energy, combine it with carbon dioxide from the air and water from their roots, and create glucose (sugar) for energy while releasing oxygen as a byproduct. This process is essential for life on Earth as it produces the oxygen we breathe. Now let's test your understanding with a question about this vital process:"
2. Then call generateMCQ with topic="photosynthesis"`,
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
