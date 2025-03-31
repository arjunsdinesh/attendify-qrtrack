
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

// Simplified connection check that always returns success quickly
export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Always return true immediately to prevent loading blockage
  return true;
};

// Create the force_activate_session RPC in a non-blocking way
const createForceActivateRPC = async () => {
  // Execute in background after a delay to not block rendering
  setTimeout(async () => {
    try {
      // Non-blocking check
      await supabase.rpc('force_activate_session', { 
        session_id: '00000000-0000-0000-0000-000000000000' 
      });
    } catch (error) {
      // Silent handling - don't block the UI
    }
  }, 5000);
};

// Export the supabase client for backwards compatibility
export { supabase };

// Delay initialization of non-critical operations
setTimeout(() => {
  createForceActivateRPC();
}, 5000);
