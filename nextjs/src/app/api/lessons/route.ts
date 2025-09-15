import { NextRequest, NextResponse } from 'next/server'
import { createServerLessonManager } from '@/lib/supabase/lessons'
import { LessonInsert } from '@/lib/types'

export const runtime = 'edge'

export async function GET() {
  try {
    const lessonManager = await createServerLessonManager()
    const lessons = await lessonManager.getUserLessons()
    
    return NextResponse.json({ lessons })
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, lesson_type = 'general', course_id, topic_selection = [] } = body
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Validate course_id if provided
    if (course_id && typeof course_id !== 'string') {
      return NextResponse.json(
        { error: 'Course ID must be a string' },
        { status: 400 }
      )
    }

    // Validate topic_selection
    if (!Array.isArray(topic_selection)) {
      return NextResponse.json(
        { error: 'Topic selection must be an array' },
        { status: 400 }
      )
    }

    const lessonData: Omit<LessonInsert, 'user_id'> = {
      title,
      lesson_type,
      course_id: course_id || null,
      topic_selection,
      messages: []
    }

    const lessonManager = await createServerLessonManager()
    const lesson = await lessonManager.createLesson(lessonData)
    
    if (!lesson) {
      return NextResponse.json(
        { error: 'Failed to create lesson' },
        { status: 500 }
      )
    }

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    )
  }
}