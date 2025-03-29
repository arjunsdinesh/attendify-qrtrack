import { createClient } from '@supabase/supabase-js';

// Import the values from the working Supabase client configuration
const SUPABASE_URL = "https://ushmvfuczmqjjtwnqebp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG12ZnVjem1xamp0d25xZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzUwNzYsImV4cCI6MjA1Njg1MTA3Nn0.XJ-Xt_WOcu1Jbx6qFrMfJ265mPxNFo5dwj0eQb-PUUQ";

// Enhanced Supabase client configuration for faster connection
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  },
  realtime: {
    timeout: 30000, // Reduced timeout for faster connection
    heartbeatIntervalMs: 8000, // Optimized heartbeat interval
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
    
    // If we get a specific error about session not found, that means the function exists
    if (error && (error.message.includes('no rows') || error.code === 'PGRST116')) {
      console.log('force_activate_session function exists and is accessible');
    } else if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.warn('force_activate_session function does not exist, please create it in the Supabase SQL editor');
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

// Faster connection check with shorter timeout and optimized queries
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Performing quick database connection check...');
    
    // Create a faster timeout for better responsiveness
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Connection check timed out after 3 seconds');
      controller.abort();
    }, 3000); // Reduced from 6 seconds to 3 seconds
    
    try {
      // Use a simpler, faster query to check connection
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (!error) {
        console.log('Database connection successful');
        return true;
      }
      
      console.warn('Initial connection check failed, trying fallback');
      
      // Simple fallback query with no joins or complex logic
      const { error: fallbackError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
        
      if (!fallbackError) {
        console.log('Fallback connection successful');
        return true;
      }
      
      console.error('Database connection failed after fallback attempt');
      return false;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('Database connection timed out');
        return false;
      }
      
      console.error('Database connection error:', error.message);
      return false;
    }
  } catch (error: any) {
    console.error('Exception in database connection check:', error.message);
    return false;
  }
};
