import { NextRequest, NextResponse } from 'next/server'
import { 
  getCourseMaterials, 
  addMaterial, 
  deleteMaterialWithFile, 
  uploadMaterialFile,
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const topicTags = formData.get('topicTags') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`

    // Upload file to storage
    const filePath = await uploadMaterialFile(file, courseId, fileName)
    if (!filePath) {
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Parse topic tags
    let parsedTopicTags: string[] = []
    if (topicTags) {
      try {
        parsedTopicTags = JSON.parse(topicTags)
      } catch (error) {
        console.error('Error parsing topic tags:', error)
        parsedTopicTags = []
      }
    }

    // Add material record to database
    const material = await addMaterial({
      course_id: courseId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      topic_tags: parsedTopicTags
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