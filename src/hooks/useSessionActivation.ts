
import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { forceSessionActivation, activateSessionViaRPC } from '@/utils/sessionUtils';

interface UseSessionActivationProps {
  sessionId: string;
}

interface UseSessionActivationReturn {
  sessionActive: boolean;
  sessionStatusCheck: boolean;
  error: string | null;
  lastActivationTime: number;
  forceActivateSession: () => Promise<boolean>;
  setError: (error: string | null) => void;
  setSessionActive: (active: boolean) => void;
}

export const useSessionActivation = ({ sessionId }: UseSessionActivationProps): UseSessionActivationReturn => {
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [sessionStatusCheck, setSessionStatusCheck] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivationTime, setLastActivationTime] = useState<number>(Date.now());

  // Force activate the session
  const forceActivateSession = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastActivationTime < 5000) {
        return sessionActive;
      }
      
      setSessionStatusCheck(true);
      
      const { data: checkData, error: checkError } = await supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (checkError || !checkData) {
        setSessionActive(false);
        setError('Session not found. Please create a new session.');
        return false;
      }
      
      if (checkData.is_active) {
        setSessionActive(true);
        setError(null);
        setLastActivationTime(now);
        return true;
      }
      
      // Try multiple activation methods
      const results = await Promise.allSettled([
        supabase.rpc('force_activate_session', { session_id: sessionId }),
        supabase
          .from('attendance_sessions')
          .update({ is_active: true, end_time: null })
          .eq('id', sessionId)
          .select('is_active')
          .single(),
        forceSessionActivation(sessionId)
      ]);
      
      const success = results.some(r => r.status === 'fulfilled');
      
      if (!success) {
        setSessionActive(false);
        setError('Failed to activate session. Try creating a new session.');
        return false;
      }
      
      setLastActivationTime(now);
      setSessionActive(true);
      setError(null);
      return true;
    } catch (error) {
      console.error('Error in forceActivateSession:', error);
      setError('Failed to activate session');
      return false;
    } finally {
      setSessionStatusCheck(false);
    }
  }, [sessionId, sessionActive, lastActivationTime]);

  return {
    sessionActive,
    sessionStatusCheck,
    error,
    lastActivationTime,
    forceActivateSession,
    setError,
    setSessionActive
  };
};
