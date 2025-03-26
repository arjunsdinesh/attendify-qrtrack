
import { createClient } from '@supabase/supabase-js';

// Import the values from the working Supabase client configuration
const SUPABASE_URL = "https://ushmvfuczmqjjtwnqebp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG12ZnVjem1xamp0d25xZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzUwNzYsImV4cCI6MjA1Njg1MTA3Nn0.XJ-Xt_WOcu1Jbx6qFrMfJ265mPxNFo5dwj0eQb-PUUQ";

// Create the Supabase client with improved configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token', // Consistent storage key
  },
  realtime: {
    timeout: 30000, // Reduced timeout for faster failure detection
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

// Improved connection check with better error handling
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Performing database connection check...');
    
    // Simple health check query with abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Connection check timed out after 10 seconds');
      controller.abort();
    }, 10000); // 10 second timeout
    
    try {
      const { error } = await supabase.from('profiles')
        .select('count', { count: 'exact', head: true })
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Database connection check failed:', error.message);
        return false;
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
      return false;
    }
  } catch (error: any) {
    console.error('Exception in database connection check:', error.message);
    return false;
  }
};
