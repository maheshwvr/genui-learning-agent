import { createSPAClient } from '@/lib/supabase/client'
import { createSSRClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types'

// Function to determine which client to use based on environment
async function getSupabaseClient() {
  // Check if we're on the server side (API routes)
  if (typeof window === 'undefined') {
    return await createSSRClient()
  }
  // Client side
  return createSPAClient()
}

type Material = Database['public']['Tables']['materials']['Row']
type MaterialInsert = Database['public']['Tables']['materials']['Insert']
type MaterialUpdate = Database['public']['Tables']['materials']['Update']

export async function addMaterial(material: Omit<MaterialInsert, 'user_id'>): Promise<Material | null> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await (supabase as any)
      .from('materials')
      .insert({
        ...material,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding material:', error)
    return null
  }
}

export async function getMaterial(materialId: string): Promise<Material | null> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching material:', error)
    return null
  }
}

export async function getCourseMaterials(courseId: string): Promise<Material[]> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching course materials:', error)
    return []
  }
}

export async function getCourseMaterialsByTopics(courseId: string, topics: string[]): Promise<Material[]> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    if (topics.length === 0) {
      // If no topics specified, return all materials
      return getCourseMaterials(courseId)
    }

    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .overlaps('topic_tags', topics)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching materials by topics:', error)
    return []
  }
}

export async function getCourseTopics(courseId: string): Promise<{ name: string; materialCount: number }[]> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('materials')
      .select('topic_tags')
      .eq('course_id', courseId)
      .eq('user_id', user.id)

    if (error) throw error

    // Flatten all topic tags and count occurrences
    const topicCounts = {} as Record<string, number>
    
    (data || []).forEach((material: { topic_tags?: string[] }) => {
      if (material.topic_tags && Array.isArray(material.topic_tags)) {
        material.topic_tags.forEach((topic: string) => {
          if (topic && topic.trim()) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1
          }
        })
      }
    })

    // Convert to Topic array and sort by name
    return Object.entries(topicCounts)
      .map(([name, materialCount]) => ({ name, materialCount }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching course topics:', error)
    return []
  }
}

export async function updateMaterial(materialId: string, updates: MaterialUpdate): Promise<Material | null> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await (supabase as any)
      .from('materials')
      .update(updates)
      .eq('id', materialId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating material:', error)
    return null
  }
}

export async function deleteMaterial(materialId: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting material:', error)
    return false
  }
}

export async function deleteMaterialWithFile(materialId: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // First get the material to access the file path
    const material = await getMaterial(materialId)
    if (!material) {
      throw new Error('Material not found')
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('materials')
      .remove([material.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete the material record
    const { error: dbError } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId)
      .eq('user_id', user.id)

    if (dbError) throw dbError
    return true
  } catch (error) {
    console.error('Error deleting material with file:', error)
    return false
  }
}

export async function uploadMaterialFile(file: File, courseId: string, fileName: string): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create a file path: user_id/course_id/filename
    const filePath = `${user.id}/${courseId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('materials')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error
    return data.path
  } catch (error) {
    console.error('Error uploading material file:', error)
    return null
  }
}

export async function getSignedMaterialUrl(filePath: string): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.storage
      .from('materials')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return null
  }
}

/**
 * Update material topics (topic_tags)
 */
export async function updateMaterialTopics(materialId: string, topics: string[]): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await (supabase as any)
      .from('materials')
      .update({ topic_tags: topics })
      .eq('id', materialId)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating material topics:', error)
    return false
  }
}