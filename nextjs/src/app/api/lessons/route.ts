import { NextRequest, NextResponse } from 'next/server'
import { createServerLessonManager } from '@/lib/supabase/lessons'
import { getCourseMaterialsByTopics } from '@/lib/supabase/materials'
import { processLessonMaterials, processLessonMaterialsWithUpload } from '@/lib/ai/gemini-files'
import { LessonInsert } from '@/lib/types'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const lessonManager = await createServerLessonManager()
    const result = await lessonManager.getUserLessons(page, limit)
    
    return NextResponse.json(result)
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

    // Process materials for AI context if course_id is provided
    let materialContext = ''
    let processedMaterialsCount = 0
    
    if (course_id) {
      try {
        console.log(`Processing materials for course ${course_id} with topics:`, topic_selection)
        
        // Get materials based on course and topic selection
        const materials = await getCourseMaterialsByTopics(course_id, topic_selection)
        console.log(`Found ${materials.length} materials for processing`)
        
        if (materials.length > 0) {
          // Process materials through Gemini with upload
          const result = await processLessonMaterialsWithUpload(materials)
          materialContext = result.systemPromptAddition
          processedMaterialsCount = result.processedMaterials.filter(m => !m.error).length
          
          console.log(`Successfully processed ${processedMaterialsCount} materials for lesson context`)
        }
      } catch (error) {
        console.error('Error processing materials for lesson:', error)
        // Continue with lesson creation even if material processing fails
        materialContext = '\n\nNote: Unable to process course materials at this time.'
      }
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

    // Include material processing info in response
    const responseData = {
      lesson,
      materialContext,
      processedMaterialsCount
    }

    console.log(`Lesson created successfully with ${processedMaterialsCount} processed materials`)
    
    return NextResponse.json(responseData, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    )
  }
}