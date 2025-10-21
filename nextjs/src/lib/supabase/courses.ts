import { createSPAClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types'

// For client-side operations, always use the SPA client
function getSupabaseClient() {
  return createSPAClient()
}

export async function createCourse(course: { name: string; description?: string | null }): Promise<Database['public']['Tables']['courses']['Row'] | null> {
  try {
    console.log('createCourse called with:', course)
    
    const supabase = getSupabaseClient()
    
    // First check if we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session check:', session ? 'valid session' : 'no session', sessionError ? sessionError.message : '')
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error(`Session error: ${sessionError.message}`)
    }
    
    if (!session) {
      console.error('No valid session found')
      throw new Error('User not authenticated - no session')
    }

    // Get user from session
    const user = session.user
    console.log('User authentication check:', user ? `authenticated as ${user.email}` : 'not authenticated')
    
    if (!user) {
      console.error('User not authenticated')
      throw new Error('User not authenticated')
    }

    console.log('Inserting course into database with user_id:', user.id)
    const { data, error } = await (supabase as any)
      .from('courses')
      .insert({
        name: course.name,
        description: course.description,
        user_id: user.id,
      })
      .select()
      .single()

    console.log('Database insert result:', { data, error })
    if (error) {
      console.error('Database error details:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Error creating course:', error)
    throw error // Re-throw instead of returning null to get better error handling
  }
}

export async function getCourse(courseId: string): Promise<Database['public']['Tables']['courses']['Row'] | null> {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data, error } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching course:', error)
    return null
  }
}

export async function getUserCourses(): Promise<Database['public']['Tables']['courses']['Row'][]> {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user courses:', error)
    return []
  }
}

export async function updateCourse(courseId: string, updates: Database['public']['Tables']['courses']['Update']): Promise<Database['public']['Tables']['courses']['Row'] | null> {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data, error } = await (supabase as any)
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating course:', error)
    return null
  }
}

export async function deleteCourse(courseId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return false
    }

    const { error } = await (supabase as any)
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting course:', error)
    return false
  }
}

export async function getCourseWithMaterialCount(courseId: string): Promise<(Database['public']['Tables']['courses']['Row'] & { materialCount: number }) | null> {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data: course, error: courseError } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError) throw courseError

    const { count, error: countError } = await (supabase as any)
      .from('materials')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('user_id', user.id)

    if (countError) throw countError

    return {
      ...course,
      materialCount: count || 0
    }
  } catch (error) {
    console.error('Error fetching course with material count:', error)
    return null
  }
}

export async function getUserCoursesWithMaterialCount(): Promise<(Database['public']['Tables']['courses']['Row'] & { materialCount: number })[]> {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data: courses, error: coursesError } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (coursesError) throw coursesError

    // Get material counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course: Database['public']['Tables']['courses']['Row']) => {
        const { count, error: countError } = await (supabase as any)
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('user_id', user.id)

        if (countError) {
          console.error('Error counting materials for course:', course.id, countError)
          return { ...course, materialCount: 0 }
        }

        return { ...course, materialCount: count || 0 }
      })
    )

    return coursesWithCounts
  } catch (error) {
    console.error('Error fetching user courses with material counts:', error)
    return []
  }
}