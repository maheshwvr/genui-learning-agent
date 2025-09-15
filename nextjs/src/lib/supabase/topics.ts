import { createSPAClient } from '@/lib/supabase/client'
import { createSSRClient } from '@/lib/supabase/server'

// Function to determine which client to use based on environment
async function getSupabaseClient() {
  // Check if we're on the server side (API routes)
  if (typeof window === 'undefined') {
    return await createSSRClient()
  }
  // Client side
  return createSPAClient()
}

export interface Topic {
  id: string
  course_id: string
  user_id: string
  name: string
  created_at: string
}

export interface TopicWithCount {
  id: string
  name: string
  materialCount: number
}

/**
 * Create a new topic for a course (simplified version using topic_tags)
 * For now, this just returns a mock topic since we're using the topic_tags approach
 */
export async function createTopic(courseId: string, name: string): Promise<{ id: string; name: string; materialCount: number } | null> {
  try {
    // For now, we'll just return a success response
    // The topic will be created when a material is associated with it
    return {
      id: `topic-${Date.now()}`, // Mock ID
      name: name.trim(),
      materialCount: 0
    }
  } catch (error) {
    console.error('Error creating topic:', error)
    return null
  }
}

/**
 * Get all topics for a course with material counts (using existing topic_tags approach)
 */
export async function getCourseTopics(courseId: string): Promise<TopicWithCount[]> {
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

    // Convert to TopicWithCount array and sort by name
    return Object.entries(topicCounts)
      .map(([name, materialCount]) => ({ 
        id: `topic-${name.replace(/\s+/g, '-').toLowerCase()}`, // Generate consistent ID
        name, 
        materialCount 
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching course topics:', error)
    return []
  }
}

/**
 * Delete a topic (simplified version - removes topic from all materials)
 * topicId is expected to be in the format "topic-{name}" where name is the topic name
 */
export async function deleteTopic(topicId: string): Promise<boolean> {
  try {
    // Extract topic name from topicId (remove "topic-" prefix and convert back)
    const topicName = topicId.startsWith('topic-') 
      ? topicId.substring(6).replace(/-/g, ' ')
      : topicId

    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get all materials with this topic using the 'any' type to avoid type issues
    const { data: materials, error: materialsError } = await (supabase as any)
      .from('materials')
      .select('id, topic_tags, course_id')
      .eq('user_id', user.id)
      .contains('topic_tags', [topicName])

    if (materialsError) throw materialsError

    // Remove the topic from each material
    if (materials && materials.length > 0) {
      for (const material of materials) {
        const updatedTopics = (material.topic_tags || []).filter((tag: string) => tag !== topicName)
        
        const { error: updateError } = await (supabase as any)
          .from('materials')
          .update({ topic_tags: updatedTopics })
          .eq('id', material.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      }
    }

    return true
  } catch (error) {
    console.error('Error deleting topic:', error)
    return false
  }
}

/**
 * Get a topic by ID (simplified version)
 * topicId is expected to be in the format "topic-{name}" where name is the topic name
 */
export async function getTopic(topicId: string, courseId: string): Promise<TopicWithCount | null> {
  try {
    // Extract topic name from topicId (remove "topic-" prefix and convert back)
    const topicName = topicId.startsWith('topic-') 
      ? topicId.substring(6).replace(/-/g, ' ')
      : topicId

    const topics = await getCourseTopics(courseId)
    return topics.find(topic => topic.name === topicName) || null
  } catch (error) {
    console.error('Error fetching topic:', error)
    return null
  }
}