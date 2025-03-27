
import { supabase } from './supabase';

/**
 * Type definition for the session data structure
 */
interface SessionData {
  is_active: boolean;
  class_id: string;
  classes: {
    name: string;
  };
  id?: string;
}

/**
 * Result of session verification
 */
interface SessionVerificationResult {
  exists: boolean;
  isActive: boolean;
  data?: SessionData;
  error?: string;
}

/**
 * Fetch session data with basic information
 */
async function fetchSessionBasicData(sessionId: string): Promise<{ 
  data: { id: string; is_active: boolean } | null; 
  error: any 
}> {
  return supabase
    .from('attendance_sessions')
    .select('id, is_active')
    .eq('id', sessionId)
    .maybeSingle();
}

/**
 * Fetch extended session data including class information
 */
async function fetchSessionExtendedData(sessionId: string): Promise<{
  data: SessionData | null;
  error: any
}> {
  return supabase
    .from('attendance_sessions')
    .select('id, is_active, class_id, classes(name)')
    .eq('id', sessionId)
    .maybeSingle();
}

/**
 * Most reliable method to activate a session using the RPC function
 * This bypasses any JS->PostgreSQL type conversion issues
 */
export async function activateSessionViaRPC(sessionId: string): Promise<boolean> {
  try {
    console.log('Activating session via RPC function:', sessionId);
    const { data, error } = await supabase.rpc('force_activate_session', {
      session_id: sessionId
    });
    
    if (error) {
      console.error('RPC activation error:', error);
      return false;
    }
    
    console.log('RPC activation result:', data);
    return !!data;
  } catch (error) {
    console.error('Exception in RPC activation:', error);
    return false;
  }
}

/**
 * Persist session activation - more aggressive approach to ensure session stays active
 * This makes multiple attempts to ensure the session remains active, using RPC as the most reliable method
 */
async function persistSessionActivation(sessionId: string, maxAttempts = 3): Promise<boolean> {
  let attempts = 0;
  let success = false;
  
  while (attempts < maxAttempts && !success) {
    try {
      // First attempt: try direct update
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
      
      if (!error && data && data.is_active) {
        console.log(`Successfully activated session on attempt ${attempts + 1}`);
        success = true;
      } else {
        console.warn(`Failed to activate session on attempt ${attempts + 1}: ${error?.message}`);
        
        // For the last attempt or if we've failed multiple times, use the RPC method
        // which is much more reliable for boolean values
        if (attempts === maxAttempts - 1 || attempts >= 1) {
          console.log('Falling back to RPC activation method...');
          success = await activateSessionViaRPC(sessionId);
          
          if (success) {
            console.log('RPC activation successful');
            break;
          } else {
            console.error('RPC activation failed');
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Wait a bit before retrying, with increasing delay
          await new Promise(resolve => setTimeout(resolve, 300 * attempts));
        }
      }
    } catch (e) {
      console.error(`Error during session activation attempt ${attempts + 1}:`, e);
      attempts++;
      
      // If we've tried regular updates and failed, try RPC on the last attempt
      if (attempts >= maxAttempts - 1) {
        console.log('Trying RPC activation after exception...');
        success = await activateSessionViaRPC(sessionId);
        if (success) {
          console.log('RPC activation after exception successful');
          break;
        }
      }
      
      if (attempts < maxAttempts) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 300 * attempts));
      }
    }
  }
  
  return success;
}

/**
 * Verifies if a session exists and is active
 * @param sessionId The ID of the attendance session to check
 * @param forceActivate Whether to force activate the session if it exists but is inactive
 * @returns Object containing verification result, session data, and any error
 */
export const verifyAttendanceSession = async (
  sessionId: string, 
  forceActivate = true
): Promise<SessionVerificationResult> => {
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
    
    // First check if the session exists with extended data
    let { data, error } = await fetchSessionExtendedData(sessionId);
    
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
      let { data: retryData, error: retryError } = await fetchSessionBasicData(sessionId);
      
      if (retryError || !retryData) {
        console.error('Session definitively not found on second attempt:', sessionId);
        
        // Last resort - try one more time with a more direct query
        const { count, error: countError } = await supabase
          .from('attendance_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('id', sessionId);
          
        if (countError || (count || 0) === 0) {
          return { 
            exists: false, 
            isActive: false,
            error: 'Session not found'
          };
        }
        
        // If we got here, the session exists but we couldn't get full details
        return { 
          exists: true, 
          isActive: false,
          error: 'Session exists but details could not be retrieved'
        };
      }
      
      // If we get here, we found the session on the second try
      console.log('Session found on second attempt:', retryData);
      
      // Continue with the found session and get extended data
      let { data: fullData, error: fullError } = await fetchSessionExtendedData(sessionId);
        
      if (fullError || !fullData) {
        console.log('Got basic session but failed to get full details, proceeding with limited data');
        // Create a properly shaped data object with default values
        data = {
          is_active: retryData.is_active,
          class_id: '', // Provide default values for required properties
          classes: { name: 'Unknown Class' },
          id: retryData.id
        };
      } else {
        data = fullData;
      }
    }
    
    console.log('Session verification result:', data);
    
    // If session exists but is not active and we want to activate it
    if (forceActivate && data && !data.is_active) {
      console.log('Attempting to ensure session is active:', sessionId);
      
      // First try the RPC method since it's most reliable for boolean values
      let activated = await activateSessionViaRPC(sessionId);
      
      if (!activated) {
        console.log('RPC activation failed, trying persistent activation...');
        // Fall back to the more aggressive approach if RPC fails
        activated = await persistSessionActivation(sessionId);
      }
      
      if (!activated) {
        console.error('Failed to activate session after multiple attempts');
        
        // Still return that the session exists even if activation failed
        return { 
          exists: true, 
          isActive: false,
          data,
          error: 'Failed to activate session after multiple attempts'
        };
      }
      
      // Assume activation was successful
      console.log('Session activation completed');
      
      return { 
        exists: true, 
        isActive: true,
        data: { ...data, is_active: true }
      };
    }
    
    // Return the current state without modifications
    return { 
      exists: true, 
      isActive: data ? !!data.is_active : false,
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
 * Force activates an attendance session using the most reliable method
 * @param sessionId The ID of the attendance session to activate
 * @returns Boolean indicating success
 */
export const activateAttendanceSession = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) return false;
    
    console.log('Force activating session:', sessionId);
    
    // Try RPC first as it's most reliable
    let success = await activateSessionViaRPC(sessionId);
    
    if (!success) {
      // Fall back to persistent activation if RPC fails
      success = await persistSessionActivation(sessionId);
    }
    
    return success;
  } catch (error) {
    console.error('Exception in activateAttendanceSession:', error);
    return false;
  }
};

/**
 * Direct function to forcefully update a session's status using the most reliable method
 * @param sessionId The ID of the attendance session to activate
 * @returns Boolean indicating success
 */
export const forceSessionActivation = async (sessionId: string): Promise<boolean> => {
  try {
    // Try RPC first (most reliable)
    const rpcSuccess = await activateSessionViaRPC(sessionId);
    if (rpcSuccess) {
      return true;
    }
    
    console.log('RPC activation failed, trying standard update');
    
    // Fall back to standard update if RPC fails
    const { data, error } = await supabase
      .from('attendance_sessions')
      .update({ is_active: true, end_time: null })
      .eq('id', sessionId)
      .select('is_active')
      .single();
      
    if (error || !data || !data.is_active) {
      console.error('Standard update failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in forceSessionActivation:', error);
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
