
import { supabase } from '@/integrations/supabase/client';

/**
 * Force activate a session using direct SQL update
 */
export const forceSessionActivation = async (sessionId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .update({ is_active: true, end_time: null })
      .eq('id', sessionId)
      .select('is_active')
      .single();
      
    return !error && !!data?.is_active;
  } catch (error) {
    console.error('Error activating session:', error);
    return false;
  }
};

/**
 * Activate session using RPC function
 */
export const activateSessionViaRPC = async (sessionId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('force_activate_session', {
      session_id: sessionId
    });
    
    return !error && !!data;
  } catch (error) {
    console.error('Error in RPC activation:', error);
    return false;
  }
};

/**
 * Ensure a session is active using multiple methods
 */
export const ensureSessionActive = async (sessionId: string): Promise<void> => {
  try {
    await Promise.all([
      forceSessionActivation(sessionId),
      activateSessionViaRPC(sessionId),
      supabase
        .from('attendance_sessions')
        .update({ is_active: true, end_time: null })
        .eq('id', sessionId)
    ]);
  } catch (error) {
    console.error('Error ensuring session active:', error);
  }
};
