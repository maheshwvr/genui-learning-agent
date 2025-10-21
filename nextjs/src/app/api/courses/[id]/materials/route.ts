import { NextRequest, NextResponse } from 'next/server'
import { 
  addMaterial, 
  deleteMaterialWithFile
} from '@/lib/supabase/materials'
import { createSSRClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = id

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Use server-side client directly in API route
    const supabase = await createSSRClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json({ materials: [], topics: [] })
    }

    // Verify course exists and user has access
    const { data: course, error: courseError } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Fetch materials directly
    const { data: materials, error: materialsError } = await (supabase as any)
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (materialsError) {
      throw materialsError
    }

    // Fetch topics directly
    const { data: topicsData, error: topicsError } = await (supabase as any)
      .from('topics')
      .select('id, name')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('name')

    if (topicsError) {
      throw topicsError
    }

    // Get material counts for each topic from topic_tags
    const { data: materialsForTopics, error: materialsForTopicsError } = await (supabase as any)
      .from('materials')
      .select('topic_tags')
      .eq('course_id', courseId)
      .eq('user_id', user.id)

    if (materialsForTopicsError) {
      throw materialsForTopicsError
    }

    // Count materials for each topic
    const topicCounts = {} as Record<string, number>
    
    (materialsForTopics || []).forEach((material: { topic_tags?: string[] }) => {
      if (material.topic_tags && Array.isArray(material.topic_tags)) {
        material.topic_tags.forEach((topicName: string) => {
          topicCounts[topicName] = (topicCounts[topicName] || 0) + 1
        })
      }
    })

    // Combine topics with their material counts
    const topics = (topicsData || []).map((topic: { id: string; name: string }) => ({
      id: topic.id,
      name: topic.name,
      materialCount: topicCounts[topic.name] || 0
    }))

    return NextResponse.json({ 
      materials: materials || [], 
      topics: topics || [] 
    })
  } catch (error) {
    console.error('Error fetching course materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course materials' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = id

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Use server-side client directly in API route
    const supabase = await createSSRClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Verify course exists and user has access
    const { data: course, error: courseError } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Parse JSON body for TUS upload completion
    const body = await request.json()
    const { file_name, file_path, file_size, mime_type, topic_tags } = body

    if (!file_name || !file_path || !file_size || !mime_type) {
      return NextResponse.json(
        { error: 'Missing required file information' },
        { status: 400 }
      )
    }

    // Add material record to database after TUS upload completion
    const material = await addMaterial({
      course_id: courseId,
      file_name,
      file_path,
      file_size,
      mime_type,
      topic_tags: topic_tags || []
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Failed to save material record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    console.error('Error adding material:', error)
    return NextResponse.json(
      { error: 'Failed to add material' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = id
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')

    if (!courseId || !materialId) {
      return NextResponse.json(
        { error: 'Course ID and Material ID are required' },
        { status: 400 }
      )
    }

    // Use server-side client directly in API route
    const supabase = await createSSRClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Verify course exists and user has access
    const { data: course, error: courseError } = await (supabase as any)
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const success = await deleteMaterialWithFile(materialId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete material' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}