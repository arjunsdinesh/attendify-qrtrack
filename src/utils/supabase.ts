
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is not defined in .env');
  throw new Error('Supabase URL is required');
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is not defined in .env');
  throw new Error('Supabase Anon Key is required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
export const checkSupabaseConnection = async (forceCheck = false): Promise<boolean> => {
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
