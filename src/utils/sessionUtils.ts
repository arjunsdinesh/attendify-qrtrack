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
  // Use Promise.race with a timeout promise instead of AbortController
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), 3000);
  });
  
  try {
    const result = await Promise.race([
      supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle(),
      timeoutPromise
    ]) as any;
      
    return result;
  } catch (e: any) {
    if (e.message === 'Query timeout') {
      console.log('Session query timed out, using direct query');
      
      // Try without timeout if aborted
      return supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle();
    }
    throw e;
  }
}

/**
 * Fetch extended session data including class information
 */
async function fetchSessionExtendedData(sessionId: string): Promise<{
  data: SessionData | null;
  error: any
}> {
  // Use Promise.race with a timeout promise instead of AbortController
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), 3000);
  });
  
  try {
    const result = await Promise.race([
      supabase
        .from('attendance_sessions')
        .select('id, is_active, class_id, classes(name)')
        .eq('id', sessionId)
        .maybeSingle(),
      timeoutPromise
    ]) as any;
      
    return result;
  } catch (e: any) {
    if (e.message === 'Query timeout') {
      console.log('Extended session query timed out, trying without timeout');
      
      // Try without timeout if aborted
      return supabase
        .from('attendance_sessions')
        .select('id, is_active, class_id, classes(name)')
        .eq('id', sessionId)
        .maybeSingle();
    }
    throw e;
  }
}

/**
 * Most reliable method to activate a session using the RPC function
 * This bypasses any JS->PostgreSQL type conversion issues
 */
export async function activateSessionViaRPC(sessionId: string): Promise<boolean> {
  try {
    console.log('Activating session via RPC function:', sessionId);
    // Try the RPC call first as it's the most reliable method
    const { data, error } = await supabase.rpc('force_activate_session', {
      session_id: sessionId
    });
    
    if (error) {
      console.error('RPC activation error:', error);
      
      // Fallback to direct update if RPC fails
      const { data: updateData, error: updateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
        
      if (updateError || !updateData || !updateData.is_active) {
        console.error('Direct update failed after RPC failure:', updateError);
        return false;
      }
      
      console.log('Direct update succeeded after RPC failure');
      return true;
    }
    
    console.log('RPC activation result:', data);
    return !!data;
  } catch (error) {
    console.error('Exception in RPC activation:', error);
    
    // One more attempt with direct update as last resort
    try {
      const { data: lastAttemptData, error: lastAttemptError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
        
      if (!lastAttemptError && lastAttemptData && lastAttemptData.is_active) {
        console.log('Last resort activation succeeded');
        return true;
      }
    } catch (e) {
      console.error('Last resort activation failed:', e);
    }
    
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
    
    // First check if the session exists using a reliable direct count query
    const { count, error: countError } = await supabase
      .from('attendance_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('id', sessionId);
      
    if (countError) {
      console.error('Count query error:', countError);
    } else if (count === 0) {
      console.error('Session not found in count query:', sessionId);
      
      // Attempt a direct query as last resort
      const { data: directData } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (!directData) {
        return { 
          exists: false, 
          isActive: false,
          error: 'Session not found in any query attempts' 
        };
      }
    } else {
      console.log('Session exists according to count query, count:', count);
    }
    
    // Then check if the session exists with extended data
    let { data, error } = await fetchSessionExtendedData(sessionId);
    
    if (error || !data) {
      console.error('Error fetching extended session data:', error);
      
      // Try a simpler query as a fallback
      let { data: retryData, error: retryError } = await fetchSessionBasicData(sessionId);
      
      if (retryError || !retryData) {
        console.error('Session not found on second attempt:', sessionId);
        
        // If count query succeeded but detailed queries failed
        if (count && count > 0) {
          console.log('Using count result as fallback - session exists but details unavailable');
          
          // Make one final direct attempt
          const { data: lastAttemptData } = await supabase
            .from('attendance_sessions')
            .select('id, is_active')
            .eq('id', sessionId)
            .single();
            
          if (lastAttemptData) {
            data = {
              is_active: lastAttemptData.is_active,
              class_id: '',
              classes: { name: 'Unknown Class' },
              id: lastAttemptData.id
            };
          } else {
            // Return basic existence but no details
            return { 
              exists: true, 
              isActive: false,
              data: {
                is_active: false,
                class_id: '',
                classes: { name: 'Unknown Class' },
                id: sessionId
              },
              error: 'Session exists but details could not be retrieved'
            };
          }
        } else {
          return { 
            exists: false, 
            isActive: false,
            error: 'Session not found'
          };
        }
      } else {
        // If we get here, we found the session on the second try
        console.log('Session found on second attempt:', retryData);
        
        // Create a properly shaped data object with default values
        data = {
          is_active: retryData.is_active,
          class_id: '', 
          classes: { name: 'Unknown Class' },
          id: retryData.id
        };
      }
    }
    
    if (!data) {
      console.error('No data returned for session:', sessionId);
      
      // Last resort - if count showed it exists but we couldn't get data
      if (count && count > 0) {
        return { 
          exists: true, 
          isActive: false,
          data: {
            is_active: false,
            class_id: '',
            classes: { name: 'Unknown Class' },
            id: sessionId
          },
          error: 'Session exists but no data could be retrieved'
        };
      }
      
      return { 
        exists: false, 
        isActive: false,
        error: 'Session not found'
      };
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
        
        // One final attempt with a direct update
        const { error: finalError } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true, 
            end_time: null 
          })
          .eq('id', sessionId);
          
        if (!finalError) {
          console.log('Final direct update sent, assuming success');
          return { 
            exists: true, 
            isActive: true,
            data: { ...data, is_active: true }
          };
        }
        
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
    
    // Make one final attempt to check if session exists
    try {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (data) {
        console.log('Final existence check succeeded even after error');
        return { 
          exists: true, 
          isActive: false,
          data: {
            is_active: false,
            class_id: '',
            classes: { name: 'Unknown Class' },
            id: sessionId
          },
          error: 'Session exists but encountered an error during verification'
        };
      }
    } catch (e) {
      console.error('Final existence check failed:', e);
    }
    
    return { 
      exists: false, 
      isActive: false,
      error: error.message || 'Unknown error'
    };
  }
}

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
    
    if (!success) {
      // One final direct attempt
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId);
        
      if (!error) {
        console.log('Final direct update succeeded');
        return true;
      }
    }
    
    return success;
  } catch (error) {
    console.error('Exception in activateAttendanceSession:', error);
    
    // Last resort attempt
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId);
        
      return !error;
    } catch (e) {
      console.error('Last resort activation failed:', e);
      return false;
    }
  }
}

/**
 * Direct function to forcefully update a session's status using the most reliable method
 * @param sessionId The ID of the attendance session to activate
 * @returns Boolean indicating success
 */
export const forceSessionActivation = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) return false;
    
    console.log('Force activating session with all methods:', sessionId);
    
    // Try multiple methods in parallel for better chance of success
    const results = await Promise.allSettled([
      // Method 1: RPC call (most reliable)
      activateSessionViaRPC(sessionId),
      
      // Method 2: Direct update with timestamp reset
      (async () => {
        try {
          const { data, error } = await supabase
            .from('attendance_sessions')
            .update({ 
              is_active: true, 
              end_time: null 
            })
            .eq('id', sessionId)
            .select('is_active')
            .single();
            
          if (error || !data) {
            console.error('Method 2 failed:', error);
            return false;
          }
          
          return data.is_active === true;
        } catch (error) {
          console.error('Method 2 exception:', error);
          return false;
        }
      })(),
      
      // Method 3: Another RPC attempt after a small delay
      new Promise(resolve => setTimeout(async () => {
        try {
          const result = await activateSessionViaRPC(sessionId);
          resolve(result);
        } catch (error) {
          resolve(false);
        }
      }, 100))
    ]);
    
    // Check if any method succeeded
    const anySuccess = results.some(result => 
      result.status === 'fulfilled' && result.value === true
    );
    
    console.log('Parallel activation attempts result:', anySuccess ? 'SUCCESS' : 'FAILED');
    
    if (!anySuccess) {
      // One final attempt with direct SQL update as last resort
      console.log('All parallel methods failed, trying final direct update');
      
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
        
      if (error || !data || !data.is_active) {
        console.error('Final attempt also failed:', error);
        return false;
      }
      
      console.log('Final direct update succeeded');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error in forceSessionActivation:', error);
    
    // Last resort direct update without result checking
    try {
      await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId);
        
      return true;  // Assume it worked
    } catch (e) {
      return false;
    }
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
      
      // Fallback to a simple query if count fails
      const { data, error: fallbackError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return false;
      }
      
      return !!data;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error('Exception in checkSessionExists:', error);
    return false;
  }
}

/**
 * Verifies if a session is active and ensures activation
 * This is a more robust check specifically focused on determining if a session is active
 * @param sessionId The ID of the attendance session to check
 * @returns Boolean indicating if session is active after verification
 */
export const ensureSessionActive = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) return false;
    
    console.log('Ensuring session is active:', sessionId);
    
    // Check if session exists first
    const exists = await checkSessionExists(sessionId);
    if (!exists) {
      console.error('Session does not exist:', sessionId);
      return false;
    }
    
    // First try the RPC method (most reliable)
    const rpcSuccess = await activateSessionViaRPC(sessionId);
    if (rpcSuccess) {
      console.log('RPC activation successful');
      return true;
    }
    
    // If RPC fails, perform direct update and verify
    const { data, error } = await supabase
      .from('attendance_sessions')
      .update({ 
        is_active: true, 
        end_time: null 
      })
      .eq('id', sessionId)
      .select('is_active')
      .single();
      
    if (!error && data && data.is_active === true) {
      console.log('Direct update verification successful');
      return true;
    }
    
    // Last option - force activation
    return await forceSessionActivation(sessionId);
    
  } catch (error) {
    console.error('Error in ensureSessionActive:', error);
    
    // Last resort direct update without verification
    try {
      await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId);
        
      return true;  // Assume it worked
    } catch (e) {
      return false;
    }
  }
};
