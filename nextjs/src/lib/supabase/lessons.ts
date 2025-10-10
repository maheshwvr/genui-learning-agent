import { createSPAClient } from './client'
import { createSSRClient } from './server'
import { Lesson, LessonInsert, LessonUpdate, ChatMessage, Json } from '@/lib/types'

export class LessonManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Create a new lesson for the authenticated user
   */
  async createLesson(data: Omit<LessonInsert, 'user_id'>): Promise<Lesson | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const lessonData: LessonInsert = {
      ...data,
      user_id: user.id,
      messages: (data.messages || []) as Json
    }

    const { data: lesson, error } = await this.supabase
      .from('lessons')
      .insert(lessonData)
      .select()
      .single()

    if (error) {
      console.error('Error creating lesson:', error)
      return null
    }

    return this.formatLesson(lesson)
  }

  /**
   * Get a specific lesson by ID (only if owned by current user)
   */
  async getLesson(id: string): Promise<Lesson | null> {
    const { data: lesson, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching lesson:', error)
      return null
    }

    return this.formatLesson(lesson)
  }

  /**
   * Get all lessons for the authenticated user with pagination
   */
  async getUserLessons(page: number = 1, limit: number = 10): Promise<{
    lessons: Lesson[]
    totalCount: number
    hasMore: boolean
    page: number
    limit: number
  }> {
    const offset = (page - 1) * limit

    // Get total count
    const { count, error: countError } = await this.supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error fetching lesson count:', countError)
      return {
        lessons: [],
        totalCount: 0,
        hasMore: false,
        page,
        limit
      }
    }

    // Get paginated lessons
    const { data: lessons, error } = await this.supabase
      .from('lessons')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user lessons:', error)
      return {
        lessons: [],
        totalCount: count || 0,
        hasMore: false,
        page,
        limit
      }
    }

    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    return {
      lessons: lessons.map((lesson: any) => this.formatLesson(lesson)), // eslint-disable-line @typescript-eslint/no-explicit-any
      totalCount,
      hasMore,
      page,
      limit
    }
  }

  /**
   * Update a lesson (messages, title, etc.)
   */
  async updateLesson(id: string, updates: LessonUpdate): Promise<Lesson | null> {
    const { data: lesson, error } = await this.supabase
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lesson:', error)
      return null
    }

    return this.formatLesson(lesson)
  }

  /**
   * Replace all messages in a lesson
   */
  async replaceAllMessages(lessonId: string, messages: ChatMessage[]): Promise<Lesson | null> {
    // Update the lesson with new messages (replacing all existing ones)
    return this.updateLesson(lessonId, { 
      messages: JSON.parse(JSON.stringify(messages)) as Json,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * Add a message to a lesson
   */
  async addMessageToLesson(lessonId: string, message: ChatMessage): Promise<Lesson | null> {
    // First get the current lesson
    const currentLesson = await this.getLesson(lessonId)
    if (!currentLesson) {
      return null
    }

    // Add the new message to the messages array
    const updatedMessages = [...currentLesson.messages, message]

    // Update the lesson with new messages
    return this.updateLesson(lessonId, { 
      messages: JSON.parse(JSON.stringify(updatedMessages)) as Json,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * Add multiple messages to a lesson (for user message + AI response)
   */
  async addMessagesToLesson(lessonId: string, messages: ChatMessage[]): Promise<Lesson | null> {
    // First get the current lesson
    const currentLesson = await this.getLesson(lessonId)
    if (!currentLesson) {
      return null
    }

    // Add the new messages to the messages array
    const updatedMessages = [...currentLesson.messages, ...messages]

    // Update the lesson with new messages
    return this.updateLesson(lessonId, { 
      messages: JSON.parse(JSON.stringify(updatedMessages)) as Json,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('lessons')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting lesson:', error)
      return false
    }

    return true
  }

  /**
   * Format lesson data from database to match our Lesson interface
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatLesson(lesson: any): Lesson {
    return {
      id: lesson.id,
      user_id: lesson.user_id,
      title: lesson.title,
      messages: Array.isArray(lesson.messages) ? lesson.messages : [],
      course_id: lesson.course_id,
      lesson_type: lesson.lesson_type,
      topic_selection: Array.isArray(lesson.topic_selection) ? lesson.topic_selection : [],
      created_at: lesson.created_at,
      updated_at: lesson.updated_at
    }
  }
}

/**
 * Create a lesson manager for client-side usage
 */
export function createClientLessonManager() {
  const supabase = createSPAClient()
  return new LessonManager(supabase)
}

/**
 * Create a lesson manager for server-side usage
 */
export async function createServerLessonManager() {
  const supabase = await createSSRClient()
  return new LessonManager(supabase)
}

// Export convenience functions
export async function createLesson(data: Omit<LessonInsert, 'user_id'>) {
  const manager = createClientLessonManager()
  return manager.createLesson(data)
}

export async function getLesson(id: string) {
  const manager = createClientLessonManager()
  return manager.getLesson(id)
}

export async function getUserLessons(page: number = 1, limit: number = 10) {
  const manager = createClientLessonManager()
  return manager.getUserLessons(page, limit)
}

export async function updateLesson(id: string, updates: LessonUpdate) {
  const manager = createClientLessonManager()
  return manager.updateLesson(id, updates)
}

export async function addMessageToLesson(lessonId: string, message: ChatMessage) {
  const manager = createClientLessonManager()
  return manager.addMessageToLesson(lessonId, message)
}

export async function addMessagesToLesson(lessonId: string, messages: ChatMessage[]) {
  const manager = createClientLessonManager()
  return manager.addMessagesToLesson(lessonId, messages)
}

export async function deleteLesson(id: string) {
  const manager = createClientLessonManager()
  return manager.deleteLesson(id)
}