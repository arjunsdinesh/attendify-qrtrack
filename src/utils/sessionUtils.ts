
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

/**
 * Check if a session exists in the database
 */
export const checkSessionExists = async (sessionId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('attendance_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('id', sessionId);
      
    if (error) {
      console.error('Error checking session existence:', error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error('Error in checkSessionExists:', error);
    return false;
  }
};

/**
 * Verify the details of an attendance session
 */
export const verifyAttendanceSession = async (sessionId: string, activateIfNeeded = false): Promise<{
  exists: boolean;
  isActive: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('id, is_active, class_id, classes(name)')
      .eq('id', sessionId)
      .maybeSingle();
      
    if (error) {
      console.error('Error verifying session:', error);
      return { exists: false, isActive: false, error: error.message };
    }
    
    if (!data) {
      return { exists: false, isActive: false };
    }
    
    // If session exists but isn't active and we want to activate it
    if (data && !data.is_active && activateIfNeeded) {
      await activateAttendanceSession(sessionId);
      
      // Re-fetch to confirm activation
      const { data: updatedData, error: updateError } = await supabase
        .from('attendance_sessions')
        .select('id, is_active, class_id, classes(name)')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (updateError) {
        return { exists: true, isActive: false, data, error: updateError.message };
      }
      
      return { 
        exists: true, 
        isActive: !!updatedData?.is_active, 
        data: updatedData || data 
      };
    }
    
    return {
      exists: true,
      isActive: !!data.is_active,
      data
    };
  } catch (error: any) {
    console.error('Error in verifyAttendanceSession:', error);
    return { 
      exists: false, 
      isActive: false, 
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Activate an attendance session and return the result
 */
export const activateAttendanceSession = async (sessionId: string): Promise<boolean> => {
  try {
    // Try direct activation first
    const { data, error } = await supabase
      .from('attendance_sessions')
      .update({ is_active: true, end_time: null })
      .eq('id', sessionId)
      .select('is_active')
      .single();
      
    if (error) {
      console.error('Error in direct activation:', error);
      return false;
    }
    
    // If direct activation worked, return true
    if (data?.is_active) {
      return true;
    }
    
    // If direct activation didn't work, try RPC
    const rpcResult = await activateSessionViaRPC(sessionId);
    
    // If RPC worked, return true
    if (rpcResult) {
      return true;
    }
    
    // Try one more direct approach (fallback)
    const { error: finalError } = await supabase
      .from('attendance_sessions')
      .update({ is_active: true, end_time: null })
      .eq('id', sessionId);
      
    return !finalError;
  } catch (error) {
    console.error('Error in activateAttendanceSession:', error);
    return false;
  }
};
