/**
 * Database Migration Script - Create Topics Table
 * Run this script to create the topics table in your Supabase database
 */

import { createClient } from '@supabase/supabase-js'

// You'll need to replace these with your actual Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Please check your environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function runMigration() {
  console.log('🚀 Starting topics table migration...')

  try {
    // Create the topics table with all necessary constraints and indexes
    const migrationSQL = `
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

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own topics" ON topics;
      DROP POLICY IF EXISTS "Users can create their own topics" ON topics;
      DROP POLICY IF EXISTS "Users can update their own topics" ON topics;
      DROP POLICY IF EXISTS "Users can delete their own topics" ON topics;

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

      -- Drop existing trigger if it exists
      DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;

      -- Create trigger for updated_at
      CREATE TRIGGER update_topics_updated_at 
          BEFORE UPDATE ON topics
          FOR EACH ROW 
          EXECUTE FUNCTION update_topics_updated_at();
    `

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }

    console.log('✅ Topics table migration completed successfully!')

    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'topics')

    if (tableError) {
      console.warn('⚠️  Could not verify table creation:', tableError)
    } else if (tables && tables.length > 0) {
      console.log('✅ Verified: topics table exists in database')
    } else {
      console.warn('⚠️  Warning: Could not find topics table after migration')
    }

  } catch (error) {
    console.error('❌ Migration failed with error:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration().then(() => {
  console.log('🎉 Migration script completed!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Migration script failed:', error)
  process.exit(1)
})