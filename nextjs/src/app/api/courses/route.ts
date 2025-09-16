import { NextRequest, NextResponse } from 'next/server'
import { createCourse, getUserCoursesWithMaterialCount, deleteCourse } from '@/lib/supabase/courses'

export async function GET() {
  try {
    const courses = await getUserCoursesWithMaterialCount()
    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/courses called')
    const body = await request.json()
    console.log('Request body:', body)
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('Invalid name provided:', name)
      return NextResponse.json(
        { error: 'Course name is required' },
        { status: 400 }
      )
    }

    console.log('Creating course with data:', { name: name.trim(), description })
    const course = await createCourse({
      name: name.trim(),
      description: description || null
    })

    console.log('Course creation result:', course)

    console.log('Course created successfully, returning:', course)
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

    const success = await deleteCourse(courseId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}