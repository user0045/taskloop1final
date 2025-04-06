import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Deletes all expired tasks from the database.
 * This will:
 * 1. Delete all tasks past their deadline
 * 2. Delete all applications for expired tasks
 * 3. Remove tasks from both "active" and "applied" tabs
 * @returns Promise with deletion status
 */
export const deleteExpiredTasks = async (): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase.rpc('delete_expired_tasks');
    
    if (error) {
      console.error('Error deleting expired tasks:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception while deleting expired tasks:', error);
    return { success: false, error };
  }
};
