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

// Create the force_activate_session RPC if it doesn't exist
const createForceActivateRPC = async () => {
  try {
    // Check if the function exists by calling it with a dummy value
    const { error } = await supabase.rpc('force_activate_session', { 
      session_id: '00000000-0000-0000-0000-000000000000' 
    });
    
    // If the function doesn't exist, error will be about function not existing
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('force_activate_session function does not exist, attempting to create it');
      
      // We can't create the function directly from client code,
      // but we can prompt the user to do so
      console.warn('Please create the force_activate_session function in your Supabase SQL editor');
    }
  } catch (error) {
    console.error('Error checking RPC function:', error);
  }
};

// Call this function when the app initializes
createForceActivateRPC();

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
      // First check attendance_sessions specifically since that's what we need
      const { error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select('count', { count: 'exact', head: true })
        .eq('is_active', true)
        .limit(1)
        .abortSignal(controller.signal);
      
      if (!sessionsError) {
        console.log('Attendance sessions table connection successful');
        clearTimeout(timeoutId);
        return true;
      }
      
      console.warn('Could not check attendance sessions, trying profiles table:', sessionsError.message);
      
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
        // Direct query to active sessions
        const { data, error: fallbackError } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('is_active', true)
          .limit(1);
        
        if (!fallbackError) {
          console.log('Fallback connection check successful');
          if (data && data.length > 0) {
            console.log('Found active sessions:', data.length);
          } else {
            console.log('Connection successful but no active sessions found');
          }
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
