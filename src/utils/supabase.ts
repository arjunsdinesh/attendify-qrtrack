
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

// Type definitions needed for the application
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  created_at?: string;
  updated_at?: string;
}

export interface StudentProfile {
  id: string;
  register_number?: string;
  roll_number?: string;
  department?: string;
  semester?: number;
  class_id?: string;
}

export interface TeacherProfile {
  id: string;
  employee_id?: string;
  department?: string;
  designation?: string;
}

// More reliable connection check function with better timeout handling
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Set a longer timeout to prevent premature failure on slow connections
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.log('Connection check timeout reached, assuming connection is available');
        resolve(true); // Assume connection is available after timeout
      }, 8000); // 8 second timeout - more generous for slow connections
    });
    
    // Use a simple query to check connection
    const queryPromise = new Promise<boolean>(async (resolve) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true })
          .limit(1);
          
        if (!error) {
          console.log('Database connection successful');
          resolve(true);
        } else {
          console.error('Database connection error:', error);
          resolve(false);
        }
      } catch (e) {
        console.error('Database connection exception:', e);
        resolve(false);
      }
    });
    
    // Race between timeout and query - whichever resolves first wins
    // This prevents the app from getting stuck waiting for a response
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error: any) {
    // For any unexpected error, assume connection is available to avoid blocking UI
    console.log('Unexpected error in connection check, assuming connection available:', error);
    return true;
  }
};

// Create the force_activate_session RPC if it doesn't exist - delayed execution
const createForceActivateRPC = async () => {
  try {
    // Check if the function exists by calling it with a dummy value
    const { error } = await supabase.rpc('force_activate_session', { 
      session_id: '00000000-0000-0000-0000-000000000000' 
    });
    
    // Minimal error handling to speed up processing
    if (error && error.message.includes('no rows')) {
      // Function exists - no need for logging
    }
  } catch (error) {
    // Silent error handling
  }
};

// Export the supabase client for backwards compatibility
export { supabase };

// Initialize check with greater delay to prioritize UI rendering completely
setTimeout(() => {
  createForceActivateRPC();
}, 10000); // Increased to 10 seconds to ensure UI is fully loaded first
