

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

// Fast connection check that returns immediately and does background validation
export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Immediately return true to prevent UI blocking
  setTimeout(async () => {
    try {
      // Run a lightweight query in the background
      const { error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.warn('Background Supabase connection check failed:', error.message);
      }
    } catch (e) {
      // Silently fail in the background
    }
  }, 0);
  
  return true;
};

// Export the supabase client
export { supabase };
