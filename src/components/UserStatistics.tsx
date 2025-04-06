import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  Clock, 
  CheckCircle, 
  RadioTower,
  Users 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Added:  A placeholder for the missing useUserRatings hook
const useUserRatings = (userId: string) => {
  const [ratings, setRatings] = useState<{
    creator_rating: number | null;
    doer_rating: number | null;
    rating_count_creator: number;
    rating_count_doer: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_ratings') // Assumed table name
          .select('*')
          .eq('user_id', userId)
          .single();
        if (error) throw error;
        setRatings(data);
      } catch (error) {
        console.error("Error fetching ratings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchRatings();
  }, [userId]);

  return { ratings, isLoading };
};


interface UserStatisticsProps {
  userId: string;
}

const UserStatistics: React.FC<UserStatisticsProps> = ({ userId }) => {
  const { ratings, isLoading } = useUserRatings(userId);
  const [tasksClosed, setTasksClosed] = useState<number>(0);
  const [tasksCompleted, setTasksCompleted] = useState<number>(0);
  const [stats, setStats] = useState({
    username: '',
    tasksCreated: 0,
    tasksInProgress: 0,
    joinDate: new Date(),
    responseRate: 85, 
    completionRate: 92, 
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Fetch user profile for username, join date, and ratings
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, created_at')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        // Fetch tasks created by user
        const { data: createdTasks, error: createdError } = await supabase
          .from('tasks')
          .select('id, status')
          .eq('creator_id', userId);

        if (createdError) throw createdError;

        // Fetch tasks completed by user (where user is doer and status is completed)
        const { data: completedTasks, error: completedError } = await supabase
          .from('tasks')
          .select('id')
          .eq('doer_id', userId)
          .eq('status', 'completed');

        if (completedError) throw completedError;

        // Fetch tasks in progress for this user
        const { data: inProgressTasks, error: inProgressError } = await supabase
          .from('tasks')
          .select('id')
          .eq('doer_id', userId)
          .eq('status', 'active');

        if (inProgressError) throw inProgressError;

        // Calculate statistics
        const tasksCreated = createdTasks.length;
        const tasksInProgress = inProgressTasks.length;

        setStats({
          username: profileData.username || 'User',
          tasksCreated,
          tasksInProgress,
          joinDate: new Date(profileData.created_at),
          responseRate: 85, 
          completionRate: tasksCreated > 0 ? Math.round((tasksCompleted / tasksCreated) * 100) : 0,
        });
      } catch (error) {
        console.error('Error fetching user statistics:', error);
      } 
    };

    if (userId) {
      fetchUserStats();
    }
  }, [userId, tasksCompleted]);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
          const { data: createdTasks, error: createdError } = await supabase
            .from('tasks')
            .select('*')
            .eq('creatorId', userId)
            .eq('status', 'completed');
          if (createdError) throw createdError;
          setTasksClosed(createdTasks?.length || 0);
    
          const { data: completedTasks, error: completedError } = await supabase
            .from('tasks')
            .select('*')
            .eq('doerId', userId)
            .eq('status', 'completed');
          if (completedError) throw completedError;
          setTasksCompleted(completedTasks?.length || 0);
        } catch (error) {
          console.error('Error fetching user statistics:', error);
        }
      };
    
      if (userId) {
        fetchUserStats();
      }
    }, [userId]);

  // Calculate membership duration
  const memberSince = stats.joinDate 
    ? `${stats.joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Unknown';

  // Determine user level based on tasks completed
  const getUserLevel = (completed: number) => {
    if (completed >= 50) return { level: 'Expert', badge: 'Gold', color: 'bg-yellow-500' };
    if (completed >= 20) return { level: 'Pro', badge: 'Silver', color: 'bg-gray-400' };
    if (completed >= 5) return { level: 'Regular', badge: 'Bronze', color: 'bg-amber-600' };
    return { level: 'Beginner', badge: 'New', color: 'bg-blue-500' };
  };

  const userLevel = getUserLevel(tasksCompleted);

  if (isLoading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Level Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Award className="mr-2 h-5 w-5 text-primary" />
            User Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-2xl font-bold">{userLevel.level}</p>
              <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
            </div>
            <Badge className={`${userLevel.color} text-white`}>{userLevel.badge}</Badge>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to next level</span>
              <span>{tasksCompleted} / {userLevel.level === 'Beginner' ? 5 : userLevel.level === 'Regular' ? 20 : userLevel.level === 'Pro' ? 50 : 100}</span>
            </div>
            <Progress 
              value={
                userLevel.level === 'Beginner' 
                  ? (tasksCompleted / 5) * 100 
                  : userLevel.level === 'Regular' 
                    ? (tasksCompleted / 20) * 100 
                    : userLevel.level === 'Pro' 
                      ? (tasksCompleted / 50) * 100 
                      : (tasksCompleted / 100) * 100
              } 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <RadioTower className="h-8 w-8 text-primary mb-2" />
              <p className="text-3xl font-bold">{stats.tasksCreated}</p>
              <p className="text-sm text-muted-foreground">Tasks Created</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-3xl font-bold">{tasksCompleted}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Clock className="h-8 w-8 text-orange-500 mb-2" />
              <p className="text-3xl font-bold">{stats.tasksInProgress}</p>
              <p className="text-sm text-muted-foreground">Tasks In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Ratings section removed */}
    </div>
  );
};

export default UserStatistics;