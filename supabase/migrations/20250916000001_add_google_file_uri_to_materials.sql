-- Add google_file_uri column to materials table for caching uploaded files
-- This prevents re-uploading the same files to Google on every chat interaction

ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS google_file_uri VARCHAR(500),
ADD COLUMN IF NOT EXISTS google_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_google_file_uri ON materials(google_file_uri) WHERE google_file_uri IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN materials.google_file_uri IS 'URI of the file uploaded to Google Generative AI File API for caching purposes';
COMMENT ON COLUMN materials.google_uploaded_at IS 'Timestamp when the file was uploaded to Google Generative AI';