-- Flashcards Storage Migration
-- Creates flashcards table for storing user-saved flashcards from generative UI

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    topic_tags TEXT[] DEFAULT '{}',
    concept TEXT NOT NULL,
    definition TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_course_id ON flashcards(course_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_tags ON flashcards USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON flashcards(created_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty ON flashcards(difficulty);
CREATE INDEX IF NOT EXISTS idx_flashcards_source_lesson_id ON flashcards(source_lesson_id);

-- Enable Row Level Security
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own flashcards
CREATE POLICY flashcards_user_policy ON flashcards
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert flashcards for themselves
CREATE POLICY flashcards_insert_policy ON flashcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own flashcards
CREATE POLICY flashcards_update_policy ON flashcards
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own flashcards
CREATE POLICY flashcards_delete_policy ON flashcards
    FOR DELETE USING (auth.uid() = user_id);

-- Update function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_flashcards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
CREATE TRIGGER flashcards_updated_at_trigger
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcards_updated_at();