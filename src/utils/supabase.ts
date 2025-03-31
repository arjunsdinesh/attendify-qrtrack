
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

// Return true immediately to prevent loading delays
export const checkSupabaseConnection = async (): Promise<boolean> => {
  return true;
};

// Export the supabase client for backwards compatibility
export { supabase };

// Clear potentially problematic session data in the background
const cleanupStaleSessionData = () => {
  try {
    const currentTime = new Date().getTime();
    const lastCleanupTime = parseInt(localStorage.getItem('last_session_cleanup') || '0', 10);
    
    // Only run cleanup once every 24 hours
    if (currentTime - lastCleanupTime < 24 * 60 * 60 * 1000) {
      return;
    }
    
    console.log('Running background session cleanup...');
    
    // Clean up obviously stale data
    const keysToCheck = Object.keys(localStorage).filter(key => 
      key.startsWith('supabase.auth.') && 
      key !== 'supabase.auth.token' &&
      key.includes('refresh')
    );
    
    keysToCheck.forEach(key => {
      console.log(`Removing stale auth data: ${key}`);
      localStorage.removeItem(key);
    });
    
    localStorage.setItem('last_session_cleanup', currentTime.toString());
  } catch (e) {
    console.log('Error in background cleanup, ignoring:', e);
  }
};

// Run cleanup in background after app loads
setTimeout(cleanupStaleSessionData, 5000);
