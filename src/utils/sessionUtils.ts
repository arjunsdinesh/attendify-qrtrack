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
    
    console.log('Verifying attendance session:', sessionId);
    
    // First check if the session exists with a more tolerant function
    let { data, error } = await supabase
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
      console.log('Attendance session not found. Attempting a second verification:', sessionId);
      
      // Try a simpler query as a fallback
      let { data: retryData, error: retryError } = await supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (retryError || !retryData) {
        console.error('Session definitively not found on second attempt:', sessionId);
        return { 
          exists: false, 
          isActive: false,
          error: 'Session not found'
        };
      }
      
      // If we get here, we found the session on the second try
      console.log('Session found on second attempt:', retryData);
      
      // Continue with the found session and get extended data
      let { data: fullData, error: fullError } = await supabase
        .from('attendance_sessions')
        .select('is_active, class_id, classes(name)')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (fullError || !fullData) {
        console.log('Got basic session but failed to get full details, proceeding with limited data');
        // We'll proceed with the basic data we have, but need to ensure it matches the expected shape
        data = {
          is_active: retryData.is_active,
          class_id: '', // Provide default values for required properties
          classes: { name: 'Unknown Class' }
        };
      } else {
        data = fullData;
      }
    }
    
    console.log('Session verification result:', data);
    
    // If session exists but is not active and we want to activate it
    if (forceActivate) {
      console.log('Attempting to ensure session is active:', sessionId);
      
      let { data: updateData, error: updateError } = await supabase
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
        // If we can't activate, we'll still return that the session exists
        // but warn that activation failed
        return { 
          exists: true, 
          isActive: !!data.is_active,
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
    
    // Deliberately using multiple update attempts with different patterns to ensure activation
    // First attempt: standard update
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
      console.error('Error activating attendance session (attempt 1):', error);
      // Try a more basic approach as fallback
      const { error: fallbackError } = await supabase
        .from('attendance_sessions')
        .update({ is_active: true })
        .eq('id', sessionId);
        
      if (fallbackError) {
        console.error('Error in fallback activation attempt:', fallbackError);
        return false;
      }
      
      // Verify the session is now active
      const { data: checkData } = await supabase
        .from('attendance_sessions')
        .select('is_active')
        .eq('id', sessionId)
        .maybeSingle();
        
      return !!checkData?.is_active;
    }
    
    return !!data?.is_active;
  } catch (error) {
    console.error('Exception in activateAttendanceSession:', error);
    return false;
  }
};

/**
 * Checks if a session exists by ID
 * @param sessionId The ID of the attendance session to check
 * @returns Boolean indicating if session exists
 */
export const checkSessionExists = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) return false;
    
    // Use count mode for efficient checking
    const { count, error } = await supabase
      .from('attendance_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('id', sessionId);
      
    if (error) {
      console.error('Error checking if session exists:', error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error('Exception in checkSessionExists:', error);
    return false;
  }
};
