import { z } from 'zod';

// Schema for individual MCQ options
export const mcqOptionSchema = z.object({
  id: z.string().describe("Unique option identifier (a, b, c, d)"),
  text: z.string().describe("Option text content"),
  isCorrect: z.boolean().describe("Whether this is the correct answer")
});

// Schema for multiple choice questions
export const mcqSchema = z.object({
  question: z.string().describe("The main question text"),
  options: z.array(mcqOptionSchema)
    .length(4)
    .describe("Array of exactly 4 answer options"),
  explanation: z.string().describe("Explanation shown after answer submission"),
  topic: z.string().describe("Learning topic this question covers"),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("Question difficulty level")
});

// Schema for lesson content structure
export const lessonContentSchema = z.object({
  type: z.enum(['text', 'mcq']).describe("Type of content block"),
  content: z.union([
    z.string().describe("Text content for text blocks"),
    mcqSchema.describe("MCQ data for question blocks")
  ])
});

// Schema for uncertainty detection triggers
export const uncertaintyIndicatorsSchema = z.object({
  phrases: z.array(z.string()).describe("Phrases that indicate user uncertainty"),
  confidence: z.number().min(0).max(1).describe("Confidence level of uncertainty detection"),
  shouldGenerateMCQ: z.boolean().describe("Whether to generate an MCQ based on uncertainty")
});

// Type exports for TypeScript
export type MCQOption = z.infer<typeof mcqOptionSchema>;
export type MCQ = z.infer<typeof mcqSchema>;
export type LessonContent = z.infer<typeof lessonContentSchema>;
export type UncertaintyIndicators = z.infer<typeof uncertaintyIndicatorsSchema>;

// Validation helpers
export const validateMCQ = (data: unknown): MCQ => {
  return mcqSchema.parse(data);
};

export const validateMCQOption = (data: unknown): MCQOption => {
  return mcqOptionSchema.parse(data);
};

// Helper function to create a properly formatted MCQ
export const createMCQ = (
  question: string,
  options: Omit<MCQOption, 'id'>[],
  explanation: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): MCQ => {
  const formattedOptions = options.map((option, index) => ({
    ...option,
    id: String.fromCharCode(97 + index) // 'a', 'b', 'c', 'd'
  }));

  return {
    question,
    options: formattedOptions,
    explanation,
    topic,
    difficulty
  };
};

// Helper function to check if exactly one option is correct
export const validateMCQCorrectness = (mcq: MCQ): boolean => {
  const correctOptions = mcq.options.filter(option => option.isCorrect);
  return correctOptions.length === 1;
};
