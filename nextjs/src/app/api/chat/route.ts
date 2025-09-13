import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    console.log('Received messages:', messages);
    console.log('API Key exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    const result = await streamText({
      model: google('gemini-2.5-flash-lite'),
      messages,
      system: 'You are a helpful AI learning assistant. Your role is to help users learn new concepts, answer questions, and provide educational guidance. Be patient, encouraging, and provide clear explanations tailored to the user\'s level of understanding.',
    });

    console.log(`Streaming response created`);
    
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
