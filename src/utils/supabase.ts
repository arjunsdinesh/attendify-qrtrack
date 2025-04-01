
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

// Truly non-blocking connection check that returns immediately
export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Always return true immediately to prevent UI blocking
  setTimeout(() => {
    // Try a lightweight query in the background
    supabase.from('profiles').select('count').limit(1)
      .then(({ error }) => {
        if (error) {
          console.warn('Background Supabase connection check failed:', error.message);
        }
      })
      .catch(e => {
        // Silent fail to avoid errors blocking UI
        console.warn('Background Supabase connection check threw an exception:', e);
      });
  }, 0);
  
  return true;
};

// Export the supabase client
export { supabase };
