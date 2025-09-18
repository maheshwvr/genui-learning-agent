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
 * Create a new topic for a course
 * This validates the topic name and ensures it doesn't already exist
 */
export async function createTopic(courseId: string, name: string): Promise<{ 
  success: true, 
  data: { id: string; name: string; materialCount: number } 
} | { 
  success: false, 
  error: string 
}> {
  try {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return { success: false, error: 'Topic name cannot be empty' }
    }

    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    console.log('Creating topic:', { courseId, trimmedName, userId: user.id })

    // Check if topic already exists using type assertion
    console.log('Checking for existing topics...')
    const { data: existingTopics, error: checkError } = await (supabase as any)
      .from('topics')
      .select('id, name')
      .eq('course_id', courseId)
      .eq('user_id', user.id)

    console.log('All existing topics:', { existingTopics, checkError })

    if (checkError) {
      console.error('Error checking existing topics:', checkError)
      return { success: false, error: 'Failed to check existing topics' }
    }

    // Check for case-insensitive duplicate
    const duplicateTopic = existingTopics?.find((topic: any) => 
      topic.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (duplicateTopic) {
      console.error('Topic already exists:', duplicateTopic.name)
      return { success: false, error: `Topic "${duplicateTopic.name}" already exists` }
    }

    // Create the topic in the database using type assertion
    console.log('Inserting new topic into database...')
    const { data: newTopic, error: createError } = await (supabase as any)
      .from('topics')
      .insert({
        course_id: courseId,
        user_id: user.id,
        name: trimmedName
      })
      .select('id, name')
      .single()

    console.log('Topic creation result:', { newTopic, createError })

    if (createError) {
      console.error('Error creating topic in database:', createError)
      
      // Handle specific database constraint violations
      if (createError.code === '23505' && createError.message?.includes('topics_course_id_name_key')) {
        return { success: false, error: `Topic "${trimmedName}" already exists in this course` }
      }
      
      return { success: false, error: 'Failed to create topic in database' }
    }

    if (!newTopic) {
      console.error('No topic returned from database insert')
      return { success: false, error: 'Failed to create topic - no data returned' }
    }

    console.log('Successfully created topic:', newTopic)
    return {
      success: true,
      data: {
        id: newTopic.id,
        name: newTopic.name,
        materialCount: 0
      }
    }
  } catch (error) {
    console.error('Error creating topic:', error)
    return { success: false, error: 'An unexpected error occurred while creating the topic' }
  }
}

/**
 * Update a topic's name
 * This validates the new name and ensures it doesn't conflict with existing topics
 */
export async function updateTopic(topicId: string, newName: string): Promise<{
  success: true,
  data: { id: string; name: string; materialCount: number }
} | {
  success: false,
  error: string
}> {
  try {
    const trimmedName = newName.trim()
    if (!trimmedName) {
      return { success: false, error: 'Topic name cannot be empty' }
    }

    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    console.log('Updating topic:', { topicId, newName: trimmedName, userId: user.id })

    // First, get the current topic to validate it exists and get course_id
    const { data: currentTopic, error: getError } = await (supabase as any)
      .from('topics')
      .select('id, name, course_id')
      .eq('id', topicId)
      .eq('user_id', user.id)
      .single()

    if (getError) {
      console.error('Error fetching current topic:', getError)
      return { success: false, error: 'Topic not found' }
    }

    if (!currentTopic) {
      return { success: false, error: 'Topic not found' }
    }

    // Check if the new name is the same as current name
    if (currentTopic.name === trimmedName) {
      return {
        success: true,
        data: {
          id: currentTopic.id,
          name: currentTopic.name,
          materialCount: 0 // Will be recalculated by the calling code
        }
      }
    }

    // Check if another topic with the new name already exists in the same course
    const { data: existingTopics, error: checkError } = await (supabase as any)
      .from('topics')
      .select('id, name')
      .eq('course_id', currentTopic.course_id)
      .eq('user_id', user.id)
      .neq('id', topicId) // Exclude the current topic

    if (checkError) {
      console.error('Error checking existing topics:', checkError)
      return { success: false, error: 'Failed to validate topic name' }
    }

    // Check for case-insensitive duplicate
    const duplicateTopic = existingTopics?.find((topic: any) => 
      topic.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (duplicateTopic) {
      console.error('Topic name already exists:', duplicateTopic.name)
      return { success: false, error: `Topic "${duplicateTopic.name}" already exists` }
    }

    // Update the topic in the database
    console.log('Updating topic in database...')
    const { data: updatedTopic, error: updateError } = await (supabase as any)
      .from('topics')
      .update({ name: trimmedName })
      .eq('id', topicId)
      .eq('user_id', user.id)
      .select('id, name')
      .single()

    if (updateError) {
      console.error('Error updating topic in database:', updateError)
      return { success: false, error: 'Failed to update topic in database' }
    }

    if (!updatedTopic) {
      console.error('No topic returned from database update')
      return { success: false, error: 'Failed to update topic - no data returned' }
    }

    // Also update the topic name in all materials that use it
    try {
      const { data: materials, error: materialsError } = await (supabase as any)
        .from('materials')
        .select('id, topic_tags')
        .eq('course_id', currentTopic.course_id)
        .eq('user_id', user.id)
        .contains('topic_tags', [currentTopic.name])

      if (materialsError) {
        console.warn('Warning: Could not fetch materials to update topic tags:', materialsError)
      } else if (materials && materials.length > 0) {
        // Update topic_tags in materials
        for (const material of materials) {
          const updatedTopicTags = (material.topic_tags || []).map((tag: string) => 
            tag === currentTopic.name ? trimmedName : tag
          )
          
          const { error: updateMaterialError } = await (supabase as any)
            .from('materials')
            .update({ topic_tags: updatedTopicTags })
            .eq('id', material.id)
            .eq('user_id', user.id)

          if (updateMaterialError) {
            console.warn('Warning: Failed to update topic tag in material:', material.id, updateMaterialError)
          }
        }
      }
    } catch (materialUpdateError) {
      console.warn('Warning: Error updating topic tags in materials:', materialUpdateError)
      // Don't fail the whole operation if material updates fail
    }

    console.log('Successfully updated topic:', updatedTopic)
    return {
      success: true,
      data: {
        id: updatedTopic.id,
        name: updatedTopic.name,
        materialCount: 0 // Will be recalculated by the calling code
      }
    }
  } catch (error) {
    console.error('Error updating topic:', error)
    return { success: false, error: 'An unexpected error occurred while updating the topic' }
  }
}

/**
 * Get all topics for a course with material counts
 */
export async function getCourseTopics(courseId: string): Promise<TopicWithCount[]> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get all topics for the course
    const { data: topics, error: topicsError } = await (supabase as any)
      .from('topics')
      .select('id, name')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('name')

    if (topicsError) throw topicsError

    // Get material counts for each topic from topic_tags
    const { data: materials, error: materialsError } = await (supabase as any)
      .from('materials')
      .select('topic_tags')
      .eq('course_id', courseId)
      .eq('user_id', user.id)

    if (materialsError) throw materialsError

    // Count materials for each topic
    const topicCounts = {} as Record<string, number>
    
    (materials || []).forEach((material: { topic_tags?: string[] }) => {
      if (material.topic_tags && Array.isArray(material.topic_tags)) {
        material.topic_tags.forEach((topicName: string) => {
          if (topicName && topicName.trim()) {
            topicCounts[topicName] = (topicCounts[topicName] || 0) + 1
          }
        })
      }
    })

    // Combine topics with their counts
    const topicsWithCounts: TopicWithCount[] = (topics || []).map((topic: any) => ({
      id: topic.id,
      name: topic.name,
      materialCount: topicCounts[topic.name] || 0
    }))

    // Also include topics that exist only in materials but not in topics table
    Object.entries(topicCounts).forEach(([topicName, count]) => {
      const existingTopic = topicsWithCounts.find((t: TopicWithCount) => t.name === topicName)
      if (!existingTopic) {
        topicsWithCounts.push({
          id: `legacy-${topicName.replace(/\s+/g, '-').toLowerCase()}`,
          name: topicName,
          materialCount: count
        })
      }
    })

    return topicsWithCounts.sort((a: TopicWithCount, b: TopicWithCount) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching course topics:', error)
    return []
  }
}

/**
 * Delete a topic from the topics table and remove it from all materials
 */
export async function deleteTopic(topicId: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if this is a legacy topic ID (format: "topic-{name}")
    if (topicId.startsWith('topic-') || topicId.startsWith('legacy-')) {
      // Extract topic name from topicId
      const topicName = topicId.startsWith('topic-') 
        ? topicId.substring(6).replace(/-/g, ' ')
        : topicId.startsWith('legacy-')
        ? topicId.substring(7).replace(/-/g, ' ')
        : topicId

      // Remove the topic from all materials using topic_tags
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

      // Also try to delete from topics table if it exists there
      const { error: deleteError } = await (supabase as any)
        .from('topics')
        .delete()
        .eq('user_id', user.id)
        .ilike('name', topicName)

      // Don't throw error if topic doesn't exist in topics table
      if (deleteError && deleteError.code !== 'PGRST116') {
        console.warn('Warning deleting from topics table:', deleteError)
      }
    } else {
      // This is a UUID, delete directly from topics table
      const { data: topic, error: getTopicError } = await (supabase as any)
        .from('topics')
        .select('name')
        .eq('id', topicId)
        .eq('user_id', user.id)
        .single()

      if (getTopicError) throw getTopicError

      if (topic) {
        // Remove from materials first
        const { data: materials, error: materialsError } = await (supabase as any)
          .from('materials')
          .select('id, topic_tags, course_id')
          .eq('user_id', user.id)
          .contains('topic_tags', [topic.name])

        if (materialsError) throw materialsError

        if (materials && materials.length > 0) {
          for (const material of materials) {
            const updatedTopics = (material.topic_tags || []).filter((tag: string) => tag !== topic.name)
            
            const { error: updateError } = await (supabase as any)
              .from('materials')
              .update({ topic_tags: updatedTopics })
              .eq('id', material.id)
              .eq('user_id', user.id)

            if (updateError) throw updateError
          }
        }

        // Delete from topics table
        const { error: deleteError } = await (supabase as any)
          .from('topics')
          .delete()
          .eq('id', topicId)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError
      }
    }

    return true
  } catch (error) {
    console.error('Error deleting topic:', error)
    return false
  }
}

/**
 * Get a topic by ID
 */
export async function getTopic(topicId: string, courseId: string): Promise<TopicWithCount | null> {
  try {
    if (topicId.startsWith('topic-') || topicId.startsWith('legacy-')) {
      // Extract topic name from legacy topicId
      const topicName = topicId.startsWith('topic-') 
        ? topicId.substring(6).replace(/-/g, ' ')
        : topicId.startsWith('legacy-')
        ? topicId.substring(7).replace(/-/g, ' ')
        : topicId

      const topics = await getCourseTopics(courseId)
      return topics.find(topic => topic.name === topicName) || null
    } else {
      // This is a UUID, look up in topics table
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: topic, error } = await (supabase as any)
        .from('topics')
        .select('id, name')
        .eq('id', topicId)
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw error
      }

      // Get material count
      const topics = await getCourseTopics(courseId)
      const topicWithCount = topics.find(t => t.id === topic.id)
      
      return topicWithCount || {
        id: topic.id,
        name: topic.name,
        materialCount: 0
      }
    }
  } catch (error) {
    console.error('Error fetching topic:', error)
    return null
  }
}