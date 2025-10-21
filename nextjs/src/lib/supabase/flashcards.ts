import { createSPAClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types'
import { Flashcard, FlashcardSet } from '@/lib/ai/lesson-schemas'

// For client-side operations, always use the SPA client
function getSupabaseClient() {
  return createSPAClient()
}

// Type definitions for flashcard database operations
export type SavedFlashcard = Database['public']['Tables']['flashcards']['Row']
export type CreateFlashcardInput = Database['public']['Tables']['flashcards']['Insert']

/**
 * Save a single flashcard to the user's personal collection
 */
export async function saveFlashcard(
  flashcard: Flashcard,
  courseId?: string,
  topicTags?: string[],
  sourceLessonId?: string
): Promise<SavedFlashcard | null> {
  try {
    console.log('saveFlashcard called with:', { flashcard, courseId, topicTags, sourceLessonId })
    
    const supabase = getSupabaseClient()
    
    // Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session?.user) {
      console.error('No valid session found')
      throw new Error('User not authenticated')
    }

    const user = session.user

    const { data, error } = await (supabase as any)
      .from('flashcards')
      .insert({
        user_id: user.id,
        course_id: courseId || null,
        topic_tags: topicTags || [],
        concept: flashcard.concept,
        definition: flashcard.definition,
        topic: flashcard.topic,
        difficulty: flashcard.difficulty,
        source_lesson_id: sourceLessonId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Flashcard saved successfully:', data)
    return data
  } catch (error) {
    console.error('Error saving flashcard:', error)
    throw error
  }
}

/**
 * Get all flashcards for a user, optionally filtered by course or topic
 */
export async function getUserFlashcards(
  courseId?: string,
  topicTags?: string[]
): Promise<SavedFlashcard[]> {
  try {
    console.log('getUserFlashcards called with:', { courseId, topicTags })
    
    const supabase = getSupabaseClient()
    
    // Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session?.user) {
      console.error('No valid session found')
      throw new Error('User not authenticated')
    }

    let query = (supabase as any)
      .from('flashcards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    // Apply course filter if provided
    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    // Apply topic tags filter if provided
    if (topicTags && topicTags.length > 0) {
      query = query.overlaps('topic_tags', topicTags)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Retrieved flashcards:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('Error retrieving flashcards:', error)
    throw error
  }
}

/**
 * Delete a specific flashcard by ID
 */
export async function deleteFlashcard(flashcardId: string): Promise<boolean> {
  try {
    console.log('deleteFlashcard called with ID:', flashcardId)
    
    const supabase = getSupabaseClient()
    
    // Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session?.user) {
      console.error('No valid session found')
      throw new Error('User not authenticated')
    }

    const { error } = await (supabase as any)
      .from('flashcards')
      .delete()
      .eq('id', flashcardId)
      .eq('user_id', session.user.id) // Ensure user can only delete their own flashcards

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Flashcard deleted successfully')
    return true
  } catch (error) {
    console.error('Error deleting flashcard:', error)
    throw error
  }
}

/**
 * Get flashcards by specific topic tags
 */
export async function getFlashcardsByTopic(topicTags: string[]): Promise<SavedFlashcard[]> {
  try {
    console.log('getFlashcardsByTopic called with:', topicTags)
    
    const supabase = getSupabaseClient()
    
    // Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session?.user) {
      console.error('No valid session found')
      throw new Error('User not authenticated')
    }

    const { data, error } = await (supabase as any)
      .from('flashcards')
      .select('*')
      .eq('user_id', session.user.id)
      .overlaps('topic_tags', topicTags)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Retrieved flashcards by topic:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('Error retrieving flashcards by topic:', error)
    throw error
  }
}

/**
 * Update a flashcard's topic tags
 */
export async function updateFlashcardTopics(
  flashcardId: string, 
  topicTags: string[]
): Promise<SavedFlashcard | null> {
  try {
    console.log('updateFlashcardTopics called with:', { flashcardId, topicTags })
    
    const supabase = getSupabaseClient()
    
    // Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session?.user) {
      console.error('No valid session found')
      throw new Error('User not authenticated')
    }

    const { data, error } = await (supabase as any)
      .from('flashcards')
      .update({ 
        topic_tags: topicTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', flashcardId)
      .eq('user_id', session.user.id) // Ensure user can only update their own flashcards
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Flashcard updated successfully:', data)
    return data
  } catch (error) {
    console.error('Error updating flashcard:', error)
    throw error
  }
}

/**
 * Check if a flashcard already exists for the user (to prevent duplicates)
 */
export async function checkFlashcardExists(
  concept: string,
  definition: string
): Promise<boolean> {
  try {
    console.log('checkFlashcardExists called with:', { concept, definition })
    
    const supabase = getSupabaseClient()
    
    // Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session?.user) {
      console.error('No valid session found')
      throw new Error('User not authenticated')
    }

    const { data, error } = await (supabase as any)
      .from('flashcards')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('concept', concept)
      .eq('definition', definition)
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    const exists = data && data.length > 0
    console.log('Flashcard exists check:', exists)
    return exists
  } catch (error) {
    console.error('Error checking flashcard existence:', error)
    return false
  }
}