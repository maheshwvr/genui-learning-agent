import { NextRequest, NextResponse } from 'next/server'
import { createServerLessonManager } from '@/lib/supabase/lessons'
import { LessonUpdate, ChatMessage } from '@/lib/types'

export const runtime = 'edge'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      )
    }

    const lessonManager = await createServerLessonManager()
    const lesson = await lessonManager.getLesson(id)
    
    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await req.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      )
    }

    const lessonManager = await createServerLessonManager()
    
    // Check if this is a message update or a general lesson update
    if (body.messages && Array.isArray(body.messages)) {
      // Handle replacing all messages in lesson (not adding)
      const { messages: newMessages } = body as { messages: ChatMessage[] }
      
      // Replace all messages completely
      const lesson = await lessonManager.replaceAllMessages(id, newMessages)
      
      if (!lesson) {
        return NextResponse.json(
          { error: 'Failed to update lesson messages' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ lesson })
    } else {
      // Handle general lesson updates (title, etc.)
      const updates: LessonUpdate = {}
      
      if (body.title) updates.title = body.title
      if (body.lesson_type) updates.lesson_type = body.lesson_type
      if (body.course_id !== undefined) updates.course_id = body.course_id
      
      const lesson = await lessonManager.updateLesson(id, updates)
      
      if (!lesson) {
        return NextResponse.json(
          { error: 'Failed to update lesson' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ lesson })
    }
  } catch (error) {
    console.error('Error updating lesson:', error)
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      )
    }

    const lessonManager = await createServerLessonManager()
    const success = await lessonManager.deleteLesson(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete lesson' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Lesson deleted successfully' })
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    )
  }
}