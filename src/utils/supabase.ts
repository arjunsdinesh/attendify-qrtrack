
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

// Non-blocking connection check with proper error handling
export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Always return true immediately to prevent UI blocking
  setTimeout(() => {
    try {
      // Use a wrapper function to make the background check more robust
      const backgroundCheck = async () => {
        try {
          const { error } = await supabase.from('profiles').select('count').limit(1);
          if (error) {
            console.warn('Background Supabase connection check failed:', error.message);
          }
        } catch (e) {
          // Silent fail to avoid errors blocking UI
          console.warn('Background Supabase connection check threw an exception:', e);
        }
      };
      
      // Execute background check with proper error handling
      backgroundCheck().catch(e => {
        console.warn('Failed to start background connection check:', e);
      });
    } catch (e) {
      // Extra safety net
      console.warn('Error setting up background check:', e);
    }
  }, 0);
  
  return true;
};

// Export the supabase client
export { supabase };
