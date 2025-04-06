
-- Create a dedicated table for user ratings
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doer_rating DECIMAL NOT NULL DEFAULT 0,
  creator_rating DECIMAL NOT NULL DEFAULT 0,
  rating_count_doer INTEGER NOT NULL DEFAULT 0,
  rating_count_creator INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_rating UNIQUE(user_id)
);

-- Add RLS policies for user_ratings table
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read user ratings
CREATE POLICY "Anyone can read user ratings" 
ON public.user_ratings FOR SELECT 
USING (true);

-- Users can insert/update their own ratings when needed
CREATE POLICY "Allow insert of user ratings" 
ON public.user_ratings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update of user ratings" 
ON public.user_ratings FOR UPDATE 
USING (true);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_ratings TO authenticated;

-- Create function to update or insert user rating
CREATE OR REPLACE FUNCTION update_user_rating(
  p_user_id UUID,
  p_is_doer BOOLEAN,
  p_new_rating DECIMAL
)
RETURNS void AS $$
DECLARE
  v_current_rating DECIMAL;
  v_rating_count INTEGER;
  v_updated_rating DECIMAL;
BEGIN
  -- Try to get current rating record
  IF p_is_doer THEN
    SELECT doer_rating, rating_count_doer INTO v_current_rating, v_rating_count
    FROM public.user_ratings
    WHERE user_id = p_user_id;
  ELSE
    SELECT creator_rating, rating_count_creator INTO v_current_rating, v_rating_count
    FROM public.user_ratings
    WHERE user_id = p_user_id;
  END IF;
  
  -- If no record exists, create a new one
  IF v_current_rating IS NULL THEN
    INSERT INTO public.user_ratings (
      user_id, 
      doer_rating, 
      creator_rating,
      rating_count_doer,
      rating_count_creator
    )
    VALUES (
      p_user_id, 
      CASE WHEN p_is_doer THEN p_new_rating ELSE 0 END,
      CASE WHEN p_is_doer THEN 0 ELSE p_new_rating END,
      CASE WHEN p_is_doer THEN 1 ELSE 0 END,
      CASE WHEN p_is_doer THEN 0 ELSE 1 END
    );
    
    -- Also update the profile record to be consistent
    IF p_is_doer THEN
      UPDATE public.profiles SET doer_rating = p_new_rating WHERE id = p_user_id;
    ELSE
      UPDATE public.profiles SET requestor_rating = p_new_rating WHERE id = p_user_id;
    END IF;
  ELSE
    -- Calculate new average rating
    v_rating_count := COALESCE(v_rating_count, 0);
    v_updated_rating := (COALESCE(v_current_rating, 0) * v_rating_count + p_new_rating) / (v_rating_count + 1);
    
    -- Update the ratings record
    IF p_is_doer THEN
      UPDATE public.user_ratings SET 
        doer_rating = v_updated_rating, 
        rating_count_doer = rating_count_doer + 1,
        updated_at = NOW()
      WHERE user_id = p_user_id;
      
      -- Also update profile
      UPDATE public.profiles SET doer_rating = v_updated_rating WHERE id = p_user_id;
    ELSE
      UPDATE public.user_ratings SET 
        creator_rating = v_updated_rating, 
        rating_count_creator = rating_count_creator + 1,
        updated_at = NOW()
      WHERE user_id = p_user_id;
      
      -- Also update profile
      UPDATE public.profiles SET requestor_rating = v_updated_rating WHERE id = p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
