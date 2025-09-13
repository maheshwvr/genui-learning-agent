'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { mcqSchema, type MCQ } from './lesson-schemas';
import { MCQ_GENERATION_PROMPT } from './prompts';

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
export async function extractTopic(messages: any[]): Promise<string> {
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
export async function assessDifficulty(messages: any[]): Promise<'easy' | 'medium' | 'hard'> {
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
