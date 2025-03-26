
import { supabase } from './supabase';

/**
 * Verifies if a session exists and is active
 * @param sessionId The ID of the attendance session to check
 * @param forceActivate Whether to force activate the session if it exists but is inactive
 * @returns Object containing verification result, session data, and any error
 */
export const verifyAttendanceSession = async (
  sessionId: string, 
  forceActivate = true
): Promise<{
  exists: boolean;
  isActive: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    if (!sessionId) {
      console.error('No session ID provided to verifyAttendanceSession');
      return { 
        exists: false, 
        isActive: false,
        error: 'No session ID provided' 
      };
    }
    
    // Check if the session exists and get its current status
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('is_active, class_id, classes(name)')
      .eq('id', sessionId)
      .maybeSingle();
    
    if (error) {
      console.error('Error verifying attendance session:', error);
      return { 
        exists: false, 
        isActive: false,
        error: error.message
      };
    }
    
    if (!data) {
      console.log('Attendance session not found:', sessionId);
      return { 
        exists: false, 
        isActive: false,
        error: 'Session not found'
      };
    }
    
    // If session exists but is not active and we want to activate it
    if (!data.is_active && forceActivate) {
      console.log('Session exists but is not active, activating:', sessionId);
      
      const { data: updateData, error: updateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .maybeSingle();
      
      if (updateError) {
        console.error('Error activating session:', updateError);
        return { 
          exists: true, 
          isActive: false,
          data,
          error: 'Failed to activate session: ' + updateError.message
        };
      }
      
      // Check if activation was successful
      const isActive = updateData ? updateData.is_active : false;
      console.log('Session activation result:', isActive);
      
      return { 
        exists: true, 
        isActive,
        data: { ...data, is_active: isActive }
      };
    }
    
    // Return the current state without modifications
    return { 
      exists: true, 
      isActive: !!data.is_active,
      data
    };
  } catch (error: any) {
    console.error('Exception in verifyAttendanceSession:', error);
    return { 
      exists: false, 
      isActive: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Force activates an attendance session
 * @param sessionId The ID of the attendance session to activate
 * @returns Boolean indicating success
 */
export const activateAttendanceSession = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) return false;
    
    console.log('Force activating session:', sessionId);
    
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
      console.error('Error activating attendance session:', error);
      return false;
    }
    
    return !!data?.is_active;
  } catch (error) {
    console.error('Exception in activateAttendanceSession:', error);
    return false;
  }
};
