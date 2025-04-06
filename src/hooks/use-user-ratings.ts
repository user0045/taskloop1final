
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserRatings {
  creator_rating: number | null;
  doer_rating: number | null;
  rating_count_creator: number;
  rating_count_doer: number;
}

export const useUserRatings = (userId: string | undefined) => {
  const [ratings, setRatings] = useState<UserRatings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('user_ratings')
          .select('creator_rating, doer_rating, rating_count_creator, rating_count_doer')
          .eq('user_id', userId)
          .single();

        if (error) {
          // If no record exists yet, create a default empty rating object
          if (error.code === 'PGRST116') {
            setRatings({
              creator_rating: 0,
              doer_rating: 0,
              rating_count_creator: 0,
              rating_count_doer: 0
            });
          } else {
            throw error;
          }
        } else {
          setRatings(data);
        }
      } catch (err) {
        console.error("Error fetching user ratings:", err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching ratings'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [userId]);

  return { ratings, isLoading, error };
};
