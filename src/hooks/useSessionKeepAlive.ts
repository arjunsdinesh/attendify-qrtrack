import { useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface UseSessionKeepAliveProps {
  sessionId: string;
  active: boolean;
  forceActivateSession: () => Promise<boolean>;
  setSessionStatus: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSessionKeepAlive = ({
  sessionId,
  active,
  forceActivateSession,
  setSessionStatus,
  setError
}: UseSessionKeepAliveProps) => {
  // Set up more aggressive session keep-alive ping
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    
    if (active && sessionId) {
      // Set up a ping every 7 seconds to keep the session active
      pingInterval = setInterval(async () => {
        try {
          console.log('Sending session keep-alive ping');
          
          const { data, error } = await supabase
            .from('attendance_sessions')
            .update({ is_active: true, end_time: null })
            .eq('id', sessionId)
            .select('is_active')
            .single();
            
          if (error) {
            console.error('Error in session keep-alive:', error);
            // Try to force reactivate on error
            await forceActivateSession();
          } else if (data && data.is_active) {
            console.log('Session keep-alive successful, confirmed active');
            setSessionStatus(true);
            setError(null);
          } else {
            console.warn('Session keep-alive response indicates inactive session');
            await forceActivateSession();
          }
        } catch (error) {
          console.error('Exception in session keep-alive:', error);
          // Try to force reactivate on error
          await forceActivateSession();
        }
      }, 7000); // Every 7 seconds
    }
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [active, sessionId, forceActivateSession, setSessionStatus, setError]);
};
