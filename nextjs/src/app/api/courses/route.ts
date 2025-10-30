import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Use server-side client for API routes
    const supabase = await createSSRClient()
    
    // Check authentication in server context
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json({ courses: [] })
    }

    // Fetch courses directly in the API route
    const { data: courses, error: coursesError } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (coursesError) {
      throw coursesError
    }

    // Get material counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course: any) => {
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

    return NextResponse.json({ courses: coursesWithCounts })
  } catch (error) {
    console.error('Error in GET /api/courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 }
      )
    }

    // Use server-side client for authentication and course creation
    const supabase = await createSSRClient()
    
    // Check authentication in server context
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      console.error('No valid user session in POST /api/courses')
      return NextResponse.json(
        { error: 'Authentication required. Please log in to create courses.' },
        { status: 401 }
      )
    }

    console.log('Creating course with authenticated user:', user.email)

    // Create course directly with server-side client
    const { data: course, error: courseError } = await (supabase as any)
      .from('courses')
      .insert({
        name: name.trim(),
        description: description || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (courseError) {
      console.error('Database error creating course:', courseError)
      throw new Error(`Failed to create course: ${courseError.message}`)
    }

    console.log('Course created successfully:', course)
    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('not authenticated')) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to create courses.' },
        { status: 401 }
      )
    }
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to create course: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('id')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Use server-side client for authentication and course deletion
    const supabase = await createSSRClient()
    
    // Check authentication in server context
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      console.error('No valid user session in DELETE /api/courses')
      return NextResponse.json(
        { error: 'Authentication required. Please log in to delete courses.' },
        { status: 401 }
      )
    }

    console.log('Deleting course with authenticated user:', user.email, 'Course ID:', courseId)

    // Delete course directly with server-side client
    const { error: deleteError } = await (supabase as any)
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Database error deleting course:', deleteError)
      throw new Error(`Failed to delete course: ${deleteError.message}`)
    }

    console.log('Course deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting course:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('not authenticated')) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to delete courses.' },
        { status: 401 }
      )
    }
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to delete course: ${errorMessage}` },
      { status: 500 }
    )
  }
}