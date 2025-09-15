-- Materials-Courses-Learn Integration Migration
-- Creates courses table and materials table for course-based organization

-- Create courses table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create materials table (only if it doesn't exist)  
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    topic_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add topic_selection column to existing lessons table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'topic_selection'
    ) THEN
        ALTER TABLE lessons ADD COLUMN topic_selection TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON materials(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at);
CREATE INDEX IF NOT EXISTS idx_materials_topic_tags ON materials USING GIN(topic_tags);

-- Enable Row Level Security (only if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'courses' AND rowsecurity = true
    ) THEN
        ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'materials' AND rowsecurity = true
    ) THEN
        ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for courses table (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' AND policyname = 'Users can view their own courses'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view their own courses" ON courses
            FOR SELECT USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' AND policyname = 'Users can create their own courses'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can create their own courses" ON courses
            FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' AND policyname = 'Users can update their own courses'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update their own courses" ON courses
            FOR UPDATE USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' AND policyname = 'Users can delete their own courses'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can delete their own courses" ON courses
            FOR DELETE USING (auth.uid() = user_id)';
    END IF;
END $$;

-- Create RLS policies for materials table (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'materials' AND policyname = 'Users can view their own materials'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view their own materials" ON materials
            FOR SELECT USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'materials' AND policyname = 'Users can create their own materials'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can create their own materials" ON materials
            FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'materials' AND policyname = 'Users can update their own materials'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update their own materials" ON materials
            FOR UPDATE USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'materials' AND policyname = 'Users can delete their own materials'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can delete their own materials" ON materials
            FOR DELETE USING (auth.uid() = user_id)';
    END IF;
END $$;

-- Create function to automatically update updated_at column (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_courses_updated_at'
    ) THEN
        EXECUTE 'CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_materials_updated_at'
    ) THEN
        EXECUTE 'CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    END IF;
END $$;