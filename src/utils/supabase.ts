
import { createClient } from '@supabase/supabase-js';

// Import the values from the working Supabase client configuration
const SUPABASE_URL = "https://ushmvfuczmqjjtwnqebp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG12ZnVjem1xamp0d25xZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzUwNzYsImV4cCI6MjA1Njg1MTA3Nn0.XJ-Xt_WOcu1Jbx6qFrMfJ265mPxNFo5dwj0eQb-PUUQ";

// Enhanced Supabase client configuration for better connection stability
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  },
  realtime: {
    timeout: 60000, // Increased timeout for better stability
    heartbeatIntervalMs: 5000, // Faster heartbeat to prevent connection drops
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public'
  }
});

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

// Improved connection check with more robust error handling and timeout
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Performing database connection check...');
    
    // Use AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Connection check timed out after 15 seconds');
      controller.abort();
    }, 15000); // Increased to 15 seconds for more reliable checking
    
    try {
      // Try a simple query first to check database access
      const { error } = await supabase.from('profiles')
        .select('count', { count: 'exact', head: true })
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Database connection check failed:', error.message);
        
        // Try a second simple query as fallback
        const { error: secondError } = await supabase.from('attendance_sessions')
          .select('count', { count: 'exact', head: true })
          .limit(1);
          
        if (secondError) {
          console.error('Second database check also failed:', secondError.message);
          return false;
        }
        
        console.log('Second database check succeeded despite first failure');
        return true;
      }
      
      console.log('Database connection successful');
      return true;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Database connection timed out');
      } else {
        console.error('Database connection error:', error.message);
      }
      
      // Try one more simple query with different approach
      try {
        const { data, error: fallbackError } = await supabase.rpc('get_service_status');
        if (!fallbackError) {
          console.log('Fallback connection check successful');
          return true;
        }
        return false;
      } catch (fallbackError) {
        console.error('Fallback connection check failed:', fallbackError);
        return false;
      }
    }
  } catch (error: any) {
    console.error('Exception in database connection check:', error.message);
    return false;
  }
};
