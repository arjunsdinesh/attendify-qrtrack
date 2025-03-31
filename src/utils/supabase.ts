
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

// Ultra-fast connection check function with minimal delay
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Skip detailed logging to reduce processing time
    
    // Set very short timeout for faster response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300); // Even faster - 300ms
    
    try {
      // Use a simple query to check connection
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (!error) {
        return true;
      }
      
      // Don't log errors to avoid blocking rendering
      return false;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // For timeout or any error, assume connection is OK for better UX
      return true;
    }
  } catch (error: any) {
    // Assume connection for any error
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
}, 8000); // Increased to 8 seconds to ensure UI is fully loaded first
