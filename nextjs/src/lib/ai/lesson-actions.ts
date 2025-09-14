'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { mcqSchema, tfSchema, type MCQ, type TF } from './lesson-schemas';
import { MCQ_GENERATION_PROMPT } from './prompts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Action to generate MCQ content
export async function generateMCQAction(params: {
  topic: string;
  context: string;
  difficulty: 'easy' | 'medium' | 'hard';
  userMessage: string;
}): Promise<MCQ | null> {
  try {
    // Generate MCQ content using AI
    const { object: mcq } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      temperature: 0.5,
      topP: 0.8,
      topK: 40,
      schema: mcqSchema,
      prompt: `${MCQ_GENERATION_PROMPT}

Topic: ${params.topic}
Difficulty: ${params.difficulty}
Recent Context: ${params.context}
User's message: ${params.userMessage}

Generate a ${params.difficulty} difficulty multiple choice question that helps the user understand ${params.topic} better. The question should be relevant to their recent message and help clarify any confusion.`,
    });

    // Validate the generated MCQ
    if (!mcq.options || mcq.options.length !== 4) {
      throw new Error('Invalid MCQ structure: must have exactly 4 options');
    }

    const correctCount = mcq.options.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error('Invalid MCQ structure: must have exactly 1 correct answer');
    }

    return mcq;
  } catch (error) {
    console.error('Error generating MCQ:', error);
    return null;
  }
}

// Action to generate True/False content
export async function generateTFAction(params: {
  topic: string;
  context: string;
  difficulty: 'easy' | 'medium' | 'hard';
  userMessage: string;
}): Promise<TF | null> {
  try {
    // Generate T/F content using AI
    const { object: tf } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      temperature: 0.5,
      topP: 0.8,
      topK: 40,
      schema: tfSchema,
      prompt: `You are an expert educational content creator specializing in True/False assessments for Socratic learning.

Create a True/False assessment that guides discovery rather than tests memory. Generate exactly 3 statements that help clarify misconceptions and explore nuanced understanding.

Topic: ${params.topic}
Difficulty: ${params.difficulty}
Recent Context: ${params.context}
User's message: ${params.userMessage}

Guidelines for T/F Statement Creation:
1. **Socratic Discovery**: Create statements that guide users to discover answers through reasoning
2. **Misconception Clarification**: Address common misunderstandings about the topic
3. **Nuanced Exploration**: Include subtle distinctions that require careful consideration
4. **Educational Value**: Each statement should teach something meaningful when explained

Difficulty Requirements:
- Easy: Clear, obvious true/false distinctions with straightforward concepts
- Medium: Requires careful consideration and solid understanding of fundamentals
- Hard: Subtle distinctions requiring deep conceptual knowledge and critical thinking

Create 3 statements with explanations that enhance understanding regardless of whether they're answered correctly.`,
    });

    // Validate the generated T/F
    if (!tf.statements || tf.statements.length !== 3) {
      throw new Error('Invalid T/F structure: must have exactly 3 statements');
    }

    // Ensure all statements have required fields
    for (const statement of tf.statements) {
      if (typeof statement.isTrue !== 'boolean' || !statement.text || !statement.explanation) {
        throw new Error('Invalid T/F statement structure: missing required fields');
      }
    }

    return tf;
  } catch (error) {
    console.error('Error generating T/F:', error);
    return null;
  }
}

// Helper function to detect uncertainty in user messages
export async function detectUncertainty(message: string): Promise<boolean> {
  const uncertaintyIndicators = [
    'i don\'t understand',
    'i\'m confused',
    'i\'m not sure',
    'what does',
    'what is',
    'can you explain',
    'help me understand',
    'i don\'t get',
    'unclear',
    'confusing',
    'not clear',
    'explain again',
    'what do you mean',
    'how does',
    'why does'
  ];

  const lowerMessage = message.toLowerCase();
  return uncertaintyIndicators.some(indicator => lowerMessage.includes(indicator));
}

// Helper function to extract topic from conversation
export async function extractTopic(messages: Message[]): Promise<string> {
  // Simple topic extraction - in a real app, you might use more sophisticated NLP
  const recentMessages = messages.slice(-3);
  const content = recentMessages
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  // Common learning topics
  const topics = [
    'mathematics', 'science', 'programming', 'history', 'literature',
    'physics', 'chemistry', 'biology', 'computer science', 'language',
    'art', 'music', 'geography', 'economics', 'psychology'
  ];

  for (const topic of topics) {
    if (content.includes(topic)) {
      return topic;
    }
  }

  return 'general knowledge';
}

// Helper function to assess difficulty level
export async function assessDifficulty(messages: Message[]): Promise<'easy' | 'medium' | 'hard'> {
  const recentMessages = messages.slice(-5);
  const content = recentMessages.map(m => m.content).join(' ').toLowerCase();

  // Indicators for different difficulty levels
  const hardIndicators = ['complex', 'advanced', 'sophisticated', 'intricate', 'comprehensive'];
  const easyIndicators = ['basic', 'simple', 'introduction', 'beginner', 'fundamental'];

  if (hardIndicators.some(indicator => content.includes(indicator))) {
    return 'hard';
  }
  
  if (easyIndicators.some(indicator => content.includes(indicator))) {
    return 'easy';
  }

  return 'medium';
}
