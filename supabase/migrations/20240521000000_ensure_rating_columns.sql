
-- Make sure rating columns exist and have default values
DO $$ 
BEGIN
    -- Check if requestor_rating column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'requestor_rating'
    ) THEN
        ALTER TABLE profiles ADD COLUMN requestor_rating DECIMAL DEFAULT 0;
    END IF;

    -- Check if doer_rating column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'doer_rating'
    ) THEN
        ALTER TABLE profiles ADD COLUMN doer_rating DECIMAL DEFAULT 0;
    END IF;

    -- Update any NULL ratings to 0
    UPDATE profiles SET requestor_rating = 0 WHERE requestor_rating IS NULL;
    UPDATE profiles SET doer_rating = 0 WHERE doer_rating IS NULL;
END $$;

-- Create index on ratings to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings (rated_id);

-- Make rating columns NOT NULL with default 0
ALTER TABLE profiles 
    ALTER COLUMN requestor_rating SET DEFAULT 0,
    ALTER COLUMN doer_rating SET DEFAULT 0,
    ALTER COLUMN requestor_rating SET NOT NULL,
    ALTER COLUMN doer_rating SET NOT NULL;
