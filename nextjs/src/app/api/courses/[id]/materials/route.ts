import { NextRequest, NextResponse } from 'next/server'
import { 
  getCourseMaterials, 
  addMaterial, 
  deleteMaterialWithFile,
  getCourseTopics
} from '@/lib/supabase/materials'
import { getCourse } from '@/lib/supabase/courses'

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

    // Verify course exists and user has access
    const course = await getCourse(courseId)
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const [materials, topics] = await Promise.all([
      getCourseMaterials(courseId),
      getCourseTopics(courseId)
    ])

    return NextResponse.json({ materials, topics })
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

    // Verify course exists and user has access
    const course = await getCourse(courseId)
    if (!course) {
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

    // Verify course exists and user has access
    const course = await getCourse(courseId)
    if (!course) {
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