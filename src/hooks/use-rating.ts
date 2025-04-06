
import { useState } from 'react';
import { TaskType } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export const useRating = (tasks: TaskType[], appliedTasks: TaskType[], handleSubmitRating: (taskId: string, rating: number) => Promise<boolean>) => {
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [isEnforcedRating, setIsEnforcedRating] = useState(false);
  const [currentTaskForRating, setCurrentTaskForRating] = useState<TaskType | null>(null);
  const { user } = useAuth();

  const checkForTasksNeedingRating = () => {
    console.log("Checking for tasks needing rating");
    console.log("Applied tasks:", appliedTasks);
    
    // First check if the user is a doer who needs to rate a task
    const doerTask = appliedTasks.find(task => 
      task.doerId === user?.id && 
      task.isRequestorVerified && 
      task.isDoerVerified && 
      !task.isDoerRated
    );
    
    console.log("Found doer task needing rating:", doerTask);
    
    if (doerTask) {
      setCurrentTaskForRating(doerTask);
      setIsRatingDialogOpen(true);
      setIsEnforcedRating(true);
      return true;
    }
    
    // Then check if the user is a creator who needs to rate a task
    const requestorTask = tasks.find(task => 
      task.isRequestorVerified && 
      task.isDoerVerified && 
      !task.isRequestorRated
    );
    
    if (requestorTask) {
      setCurrentTaskForRating(requestorTask);
      setIsRatingDialogOpen(true);
      setIsEnforcedRating(true);
      return true;
    }
    
    return false;
  };

  const handleRequestRating = () => {
    checkForTasksNeedingRating();
  };

  const onSubmitRating = async (rating: number) => {
    if (!currentTaskForRating) {
      console.error("No current task for rating");
      return false;
    }
    
    console.log(`Submitting rating ${rating} for task ${currentTaskForRating.id}`);
    
    try {
      // Call handleSubmitRating from task-actions.ts
      console.log("Calling handleSubmitRating with taskId:", currentTaskForRating.id, "and rating:", rating);
      const result = await handleSubmitRating(currentTaskForRating.id, rating);
      
      console.log("Rating submission result:", result);
      
      if (result) {
        // Only close dialog and reset state if submission was successful
        console.log("Rating submission successful, closing dialog and resetting state");
        setIsRatingDialogOpen(false);
        setCurrentTaskForRating(null);
        setIsEnforcedRating(false);
        return true;
      } else {
        console.error("Rating submission failed");
        return false;
      }
    } catch (error) {
      console.error("Error in onSubmitRating:", error);
      return false;
    }
  };

  return {
    isRatingDialogOpen,
    setIsRatingDialogOpen,
    isEnforcedRating,
    currentTaskForRating,
    checkForTasksNeedingRating,
    handleRequestRating,
    onSubmitRating
  };
};
