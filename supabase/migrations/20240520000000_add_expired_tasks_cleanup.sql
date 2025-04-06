
-- Function to delete expired tasks
CREATE OR REPLACE FUNCTION public.delete_expired_tasks()
RETURNS void AS $$
DECLARE
  expired_task_ids UUID[];
BEGIN
  -- Get IDs of expired tasks without assigned doers
  SELECT array_agg(id) INTO expired_task_ids
  FROM public.tasks
  WHERE deadline < NOW() 
    AND status = 'active'
    AND doer_id IS NULL;
  
  -- Delete applications for all expired tasks (if any)
  IF expired_task_ids IS NOT NULL AND array_length(expired_task_ids, 1) > 0 THEN
    DELETE FROM public.task_applications
    WHERE task_id = ANY(expired_task_ids);
  END IF;
  
  -- Delete all expired tasks (both assigned and unassigned)
  DELETE FROM public.tasks
  WHERE deadline < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Grant execution privileges to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_expired_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_tasks() TO service_role;

-- Create a cron job to run this function daily
-- If you're using Supabase, you can set up a scheduled job in the Supabase dashboard
-- or uncomment and run this if your database supports pg_cron:
-- SELECT cron.schedule('0 0 * * *', 'SELECT delete_expired_tasks()');
