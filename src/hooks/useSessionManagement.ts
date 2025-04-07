
import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';

interface UseSessionManagementProps {
  sessionId: string;
}

export const useSessionManagement = ({ sessionId }: UseSessionManagementProps) => {
  const [sessionStatus, setSessionStatus] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivationTime, setLastActivationTime] = useState<number>(0);
  
  // Force activate session with robust error handling
  const forceActivateSession = useCallback(async () => {
    try {
      // Only try to activate if it's been more than 5 seconds since last activation
      const now = Date.now();
      if (now - lastActivationTime < 5000) {
        console.log('Skipping activation, too soon since last attempt');
        return sessionStatus || false;
      }
      
      console.log('Force activating session:', sessionId);
      setGenerating(true);
      
      // Use update with RETURNING to get confirmation
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true,
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
        
      if (error) {
        console.error('Error activating session:', error);
        setSessionStatus(false);
        setError('Failed to activate session');
        return false;
      }
      
      // Verify the update was successful
      if (!data || !data.is_active) {
        console.error('Session activation did not work, data returned:', data);
        setSessionStatus(false);
        setError('Failed to activate session - server did not confirm activation');
        return false;
      }
      
      console.log('Session activated successfully, confirmation:', data);
      setLastActivationTime(now);
      setSessionStatus(true);
      setError(null);
      return true;
      
    } catch (error) {
      console.error('Error in forceActivateSession:', error);
      setError('Failed to activate session');
      return false;
    } finally {
      setGenerating(false);
    }
  }, [sessionId, sessionStatus, lastActivationTime]);

  // Check session status with enhanced error handling
  const checkSessionStatus = useCallback(async () => {
    if (!sessionId) return false;
    
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('is_active')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error('Error checking session status:', error);
        setSessionStatus(null);
        // Try to activate anyway on error
        return forceActivateSession();
      }
      
      setSessionStatus(data?.is_active || false);
      console.log('Session active status:', data?.is_active);
      
      if (!data?.is_active) {
        // Try to activate it
        return forceActivateSession();
      }
      
      return data?.is_active || false;
    } catch (error) {
      console.error('Exception checking session status:', error);
      // Try to activate anyway on error
      return forceActivateSession();
    }
  }, [sessionId, forceActivateSession]);

  // Start session tracking
  const startSession = async () => {
    try {
      // Generate a cryptographically secure random secret
      const array = new Uint32Array(4);
      crypto.getRandomValues(array);
      const secret = Array.from(array, x => x.toString(16)).join('');
      
      // Update the session with the new secret and mark it as active
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          qr_secret: secret, 
          is_active: true,
          end_time: null
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
      
      if (error) {
        console.error('Error starting attendance tracking:', error);
        throw error;
      }
      
      // Verify session is actually active
      if (!data || !data.is_active) {
        console.error('Session not activated despite update', data);
        // Try one more force activation
        await forceActivateSession();
      }
      
      toast.success('Attendance tracking started');
      return true;
    } catch (error) {
      console.error('Error starting attendance tracking:', error);
      toast.error('Failed to start attendance tracking');
      return false;
    }
  };

  // Stop session tracking
  const stopSession = async () => {
    try {
      // Update the session to mark it as inactive
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setSessionStatus(false);
      toast.success('Attendance tracking stopped');
      return true;
    } catch (error) {
      console.error('Error stopping attendance tracking:', error);
      toast.error('Failed to stop attendance tracking');
      return false;
    }
  };

  return {
    sessionStatus,
    generating,
    error,
    setError,
    forceActivateSession,
    checkSessionStatus,
    startSession,
    stopSession,
    setSessionStatus
  };
};
