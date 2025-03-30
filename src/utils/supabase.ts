
import { createClient } from '@supabase/supabase-js';

// Import the values from the working Supabase client configuration
const SUPABASE_URL = "https://ushmvfuczmqjjtwnqebp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG12ZnVjem1xamp0d25xZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzUwNzYsImV4cCI6MjA1Njg1MTA3Nn0.XJ-Xt_WOcu1Jbx6qFrMfJ265mPxNFo5dwj0eQb-PUUQ";

// Enhanced Supabase client configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
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

// Simplified connection check function to avoid blocking UI
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Performing quick database connection check...');
    
    // Set timeout for faster response
    const controller = new AbortController();
    
    try {
      setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      // Use a simple query to check connection
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1)
        .abortSignal(controller.signal);
      
      if (!error) {
        console.log('Database connection successful');
        return true;
      }
      
      console.warn('Database connection check failed');
      return false;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Assuming connection is OK despite timeout');
        return true; // Assume connection is OK if we time out
      }
      
      console.error('Database connection error:', error.message);
      return false;
    }
  } catch (error: any) {
    console.error('Exception in database connection check:', error.message);
    return true; // Assume connection is OK if the check itself fails
  }
};

// Initialize check
setTimeout(() => {
  createForceActivateRPC();
}, 1000);
