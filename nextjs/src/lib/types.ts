import type { MCQ, TF, Flashcard, FlashcardSet } from '@/lib/ai/lesson-schemas';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          course_id: string | null
          topic_tags: string[]
          concept: string
          definition: string
          topic: string
          difficulty: string
          source_lesson_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id?: string | null
          topic_tags?: string[]
          concept: string
          definition: string
          topic: string
          difficulty?: string
          source_lesson_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string | null
          topic_tags?: string[]
          concept?: string
          definition?: string
          topic?: string
          difficulty?: string
          source_lesson_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          id: string
          user_id: string
          title: string
          messages: Json
          course_id: string | null
          lesson_type: string
          topic_selection: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          messages?: Json
          course_id?: string | null
          lesson_type?: string
          topic_selection?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          messages?: Json
          course_id?: string | null
          lesson_type?: string
          topic_selection?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          id: string
          user_id: string
          course_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          topic_tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          topic_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          topic_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      todo_list: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          id: number
          owner: string
          title: string
          urgent: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner: string
          title: string
          urgent?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner?: string
          title?: string
          urgent?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Course and Materials Types
export interface Course {
  id: string
  user_id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  user_id: string
  course_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  topic_tags: string[]
  created_at: string
  updated_at: string
}

export interface Topic {
  name: string
  materialCount: number
}

// Chat and Lesson Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
  
  // Assessment metadata for storing tool call data and results
  assessment?: {
    type: 'mcq' | 'tf' | 'flashcards'
    data: MCQ | TF | FlashcardSet  // MCQ | TF | FlashcardSet data from lesson-schemas
    results?: {
      // For MCQ
      selectedOptionId?: string
      isCorrect?: boolean
      
      // For TF  
      answers?: Record<string, boolean>
      scores?: Array<{statementId: string, isCorrect: boolean}>
      
      // For Flashcards
      flashcardPerformance?: Array<{
        flashcardId: string
        performance: 'got-it' | 'on-track' | 'unclear'
        saved?: boolean
      }>
      
      // Common
      submittedAt?: string
      completed: boolean
    }
  }
}

export interface Lesson {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  course_id?: string | null
  lesson_type: 'general' | 'pre-exam' | 'post-lecture'
  topic_selection: string[]
  created_at: string
  updated_at: string
}

// Database type exports
export type CourseRow = Tables<'courses'>
export type CourseInsert = TablesInsert<'courses'>
export type CourseUpdate = TablesUpdate<'courses'>

export type FlashcardRow = Tables<'flashcards'>
export type FlashcardInsert = TablesInsert<'flashcards'>
export type FlashcardUpdate = TablesUpdate<'flashcards'>

export type MaterialRow = Tables<'materials'>
export type MaterialInsert = TablesInsert<'materials'>
export type MaterialUpdate = TablesUpdate<'materials'>

export type LessonInsert = TablesInsert<'lessons'>
export type LessonUpdate = TablesUpdate<'lessons'>
export type LessonRow = Tables<'lessons'>

// Drag & Drop and Topic Management interfaces
export interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
}

export interface Topic {
  id: string
  name: string
  materialCount: number
}

export interface TopicAssociationDropdownProps {
  materialId: string
  courseId: string
  currentTopics: string[]
  onTopicsChange: (topics: string[]) => void
  className?: string
}

export interface CourseTopicBannerProps {
  courseId: string
  courseName: string
  topics: Topic[]
  onTopicsChange: () => void
  className?: string
}
