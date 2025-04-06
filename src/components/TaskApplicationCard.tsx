import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MessageCircle, AlertTriangle, CalendarClock, MapPin, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { ApplicationType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import MaskedUsername from './MaskedUsername';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useUserRatings } from '@/hooks/use-user-ratings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskApplicationCardProps {
  application: ApplicationType;
  onApprove: (applicationId: string, taskId: string, applicantId: string) => void;
  onReject: (applicationId: string) => Promise<boolean>; // Modified return type
}

const TaskApplicationCard = ({ application, onApprove, onReject }: TaskApplicationCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [taskDetails, setTaskDetails] = useState<{
    location?: string;
    deadline?: Date;
    reward?: number;
    description?: string;
  }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { ratings: applicantRatings } = useUserRatings(application.userId);
  
  // Fetch additional task details and applicant rating
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch task details
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('location, deadline, reward, description')
          .eq('id', application.taskId)
          .single();
          
        if (taskError) throw taskError;
        if (taskData) {
          setTaskDetails({
            location: taskData.location,
            deadline: taskData.deadline ? new Date(taskData.deadline) : undefined,
            reward: taskData.reward,
            description: taskData.description
          });
        }
        
        // Applicant rating is now fetched using useUserRatings hook
      } catch (error) {
        console.error("Error fetching additional details:", error);
      }
    };
    
    fetchDetails();
  }, [application.taskId, application.userId]);

  const handleStartChat = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to message users.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Check if a chat already exists
      const { data: existingChats, error: chatCheckError } = await extendedSupabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${application.userId}),and(user1_id.eq.${application.userId},user2_id.eq.${user.id})`)
        .limit(1);

      if (chatCheckError) throw chatCheckError;

      let chatId;

      if (existingChats && existingChats.length > 0) {
        chatId = existingChats[0].id;
      } else {
        // Create a new chat
        const { data: newChat, error: createChatError } = await extendedSupabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: application.userId
          })
          .select()
          .single();

        if (createChatError) throw createChatError;
        chatId = newChat.id;
      }

      navigate('/chat', { 
        state: { 
          activeChatId: chatId,
          participant: {
            id: application.userId,
            name: application.username
          }
        }
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    setIsProcessing(true);
    onApprove(application.id, application.taskId, application.userId);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    if (isRejecting) return;

    try {
      setIsRejecting(true);
      const success = await onReject(application.id);

      if (success) {
        setIsRejectDialogOpen(false);
        // Add a slight delay to hide this card for better visual feedback
        setTimeout(() => {
          const element = document.getElementById(`application-card-${application.id}`);
          if (element) {
            element.style.display = 'none';
          }
        }, 300);
      }
      setIsRejecting(false);
    } catch (error) {
      setIsRejecting(false);
      toast({
        title: "Error",
        description: "Failed to reject the application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-4" id={`application-card-${application.id}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{application.taskTitle}</h3>
          
          {taskDetails.reward && (
            <Badge variant="outline" className="font-semibold">₹{taskDetails.reward}</Badge>
          )}
        </div>
        
        {taskDetails.description && (
          <div className="text-sm text-muted-foreground mt-2 mb-3 bg-muted/30 p-2 rounded-sm">
            <p className="font-medium text-xs uppercase text-muted-foreground/70 mb-1">Task Description:</p>
            <p>{taskDetails.description.substring(0, 120)}{taskDetails.description.length > 120 ? '...' : ''}</p>
          </div>
        )}
        
        <div className="flex flex-col gap-1 mb-3">
          {taskDetails.location && (
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{taskDetails.location}</span>
            </div>
          )}
          
          {taskDetails.deadline && (
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3 mr-1" />
              <span>Due: {format(new Date(taskDetails.deadline), 'MMM d, yyyy')} at {format(new Date(taskDetails.deadline), 'h:mm a')}</span>
            </div>
          )}
        </div>

        <div className="border-l-4 border-muted pl-3 my-3">
          <p className="text-sm italic">{application.message}</p>
        </div>
        
        <div className="flex justify-between items-center border-t pt-3 mt-3">
          <div className="flex items-center">
            <Avatar className="h-5 w-5 mr-1.5">
              <AvatarFallback>{application.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-sm font-medium">
              {application.username}
            </div>
          </div>
          
          {applicantRatings && (
            <div className="flex items-center" title={applicantRatings.doer_rating > 0 ? `Based on ${applicantRatings.rating_count_doer} ratings` : 'No ratings yet'}>
              <span className="text-green-600 font-medium">{applicantRatings.doer_rating > 0 ? applicantRatings.doer_rating.toFixed(1) : "N/A"}</span>
              {applicantRatings.doer_rating > 0 && <Star className="h-4 w-4 text-green-600 ml-1" fill="currentColor" />}
              {applicantRatings.rating_count_doer > 0 && (
                <span className="text-xs text-muted-foreground ml-1">({applicantRatings.rating_count_doer})</span>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-4 py-3 flex justify-end space-x-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleStartChat}
          disabled={isProcessing}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Message
        </Button>

        <Button 
          variant="default" 
          size="sm" 
          className="bg-green-600 hover:bg-green-700" 
          onClick={handleApprove}
          disabled={isProcessing}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>

        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => setIsRejectDialogOpen(true)}
          disabled={isProcessing || isRejecting}
        >
          <X className="h-4 w-4 mr-1" />
          {isRejecting ? "Rejecting..." : "Reject"}
        </Button>

        <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                Reject Application
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject this application from <span className="font-semibold">{application.username}</span>? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing || isRejecting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleReject} 
                disabled={isProcessing || isRejecting}
                className="bg-red-600 hover:bg-red-700"
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};

export default TaskApplicationCard;