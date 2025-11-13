-- Manual migration to create topics table
-- Run this SQL in your Supabase SQL Editor

-- Create topics table for course-specific topic management
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure topic names are unique within a course
    UNIQUE(course_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_course_id ON topics(course_id);
CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);

-- Enable Row Level Security
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for topics table
CREATE POLICY "Users can view their own topics" ON topics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own topics" ON topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topics" ON topics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topics" ON topics
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_topics_updated_at 
    BEFORE UPDATE ON topics
    FOR EACH ROW 
    EXECUTE FUNCTION update_topics_updated_at();