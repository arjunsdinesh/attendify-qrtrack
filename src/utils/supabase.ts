
import { createClient } from '@supabase/supabase-js';

// Import the values from the working Supabase client configuration
const SUPABASE_URL = "https://ushmvfuczmqjjtwnqebp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG12ZnVjem1xamp0d25xZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzUwNzYsImV4cCI6MjA1Njg1MTA3Nn0.XJ-Xt_WOcu1Jbx6qFrMfJ265mPxNFo5dwj0eQb-PUUQ";

// Create the Supabase client with the hardcoded values
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    timeout: 60000,
  },
  global: {
    fetch: (url, options) => fetch(url, options),
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

// Add timeout to the connection check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Performing database connection check...');
    
    // Create a promise that rejects after a timeout
    const timeout = (ms: number) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Connection attempt timed out after ${ms/1000} seconds`)), ms)
    );
    
    // Try up to 4 times with increasing timeouts
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        console.log(`Connection attempt ${attempt} of 4`);
        // Race between the connection and timeout
        await Promise.race([
          supabase.from('profiles').select('count', { count: 'exact', head: true }),
          timeout(5000) // 5 second timeout
        ]);
        
        // If we get here, the connection was successful
        console.log('Database connection successful');
        return true;
      } catch (error: any) {
        console.log(error.message);
        if (attempt < 4 && error.message.includes('timed out')) {
          continue; // Try again on timeout
        }
        throw error; // Other errors or final timeout
      }
    }
    
    return false; // Should not reach here but TypeScript needs it
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};
