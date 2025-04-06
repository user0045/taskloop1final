
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/supabase';

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => Promise<boolean>;
  taskTitle: string;
  partnerName: string;
  isDoer: boolean;
  enforcedOpen?: boolean;
  taskId?: string;
  ratedUserId?: string;
  user: User;
}

const RatingDialog: React.FC<RatingDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  partnerName,
  isDoer,
  enforcedOpen = false,
  taskId,
  ratedUserId,
  user,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  console.log("RatingDialog props:", { 
    isOpen, taskId, ratedUserId, isDoer, user: user?.id 
  });

  // Reset rating when dialog opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleMouseEnter = (hoveredIndex: number) => {
    setHoveredRating(hoveredIndex);
  };

  const handleMouseLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async () => {
    if (rating === 0 || !taskId || !ratedUserId || !user) {
      console.error("Cannot submit rating: missing required data", { 
        rating, taskId, ratedUserId, user: user?.id 
      });
      
      toast({
        title: "Missing information",
        description: "Cannot submit rating due to missing required data.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log(`Submitting rating ${rating} for user ${ratedUserId} on task ${taskId}`);
      
      // 1. Insert rating into the ratings table
      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          task_id: taskId,
          rater_id: user.id,
          rated_id: ratedUserId,
          rating: rating,
          is_for_creator: isDoer // If isDoer is true, we're rating the creator
        });

      if (ratingError) {
        // Check if it's a unique constraint error (already rated)
        if (ratingError.code === '23505') {
          console.log("Rating already exists, continuing with process");
        } else {
          console.error('Error recording rating:', ratingError);
          throw ratingError;
        }
      }

      // 2. Update the user_ratings table using the stored procedure
      const { error: updateRatingError } = await supabase.rpc('update_user_rating', {
        p_user_id: ratedUserId,
        p_is_doer: !isDoer, // If isDoer is true, we're rating the creator's requestor_rating
        p_new_rating: rating
      });

      if (updateRatingError) {
        console.error('Error updating user rating:', updateRatingError);
        throw updateRatingError;
      }

      // 3. Update the task status
      console.log(`Calling onSubmit to update task status with rating: ${rating}`);
      const success = await onSubmit(rating);
      
      if (success) {
        toast({
          title: "Rating submitted",
          description: `You've successfully rated ${partnerName}`,
        });
        
        // Force close dialog
        onClose();
        return true;
      } else {
        throw new Error("Failed to update task status");
      }
    } catch (error) {
      console.error('Error in rating submission:', error);
      toast({
        title: "Error submitting rating",
        description: `Error: ${error.message || "There was an error submitting your rating. Please try again."}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Yellow for creators (when doer is rating), green for doers (when creator is rating)
  const starColor = isDoer ? "text-yellow-500 fill-current" : "text-green-500 fill-current";
  const emptyStarColor = "text-gray-300";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!enforcedOpen && !open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate {partnerName}</DialogTitle>
          <DialogDescription>
            Please rate {isDoer ? "the task creator" : "the doer"} for task "{taskTitle}"
            {enforcedOpen && (
              <p className="mt-2 text-red-500 font-semibold">
                Rating is required to complete this task
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex justify-center mb-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <button
                key={index}
                type="button"
                className="p-1 focus:outline-none"
                onClick={() => handleRatingClick(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                disabled={isSubmitting}
              >
                <Star
                  className={`h-8 w-8 ${index <= (hoveredRating || rating) ? starColor : emptyStarColor}`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? 'Click to rate' : `You've selected ${rating} star${rating > 1 ? 's' : ''}`}
          </p>
        </div>

        <DialogFooter>
          {!enforcedOpen && (
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button 
            variant="default"
            type="button"
            onClick={handleSubmit} 
            disabled={rating === 0 || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;
