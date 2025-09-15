import { NextRequest, NextResponse } from 'next/server'
import { updateMaterialTopics } from '@/lib/supabase/materials'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const materialId = id

    if (!materialId) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { topics } = body

    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: 'Topics must be an array' },
        { status: 400 }
      )
    }

    // Validate topic names
    const validTopics = topics.filter(topic => 
      typeof topic === 'string' && topic.trim().length > 0
    ).map(topic => topic.trim())

    const success = await updateMaterialTopics(materialId, validTopics)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update material topics' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      topics: validTopics 
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating material topics:', error)
    return NextResponse.json(
      { error: 'Failed to update material topics' },
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
    const materialId = id

    if (!materialId) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      )
    }

    // Remove all topic associations
    const success = await updateMaterialTopics(materialId, [])
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove topic associations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error removing material topic associations:', error)
    return NextResponse.json(
      { error: 'Failed to remove topic associations' },
      { status: 500 }
    )
  }
}