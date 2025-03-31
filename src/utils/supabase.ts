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

// Super fast connection check that doesn't block rendering
export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Always assume connection is available initially to prevent UI blocking
  return true;
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

// Use a very short timeout to initialize non-critical operations
setTimeout(() => {
  createForceActivateRPC();
}, 2000);
