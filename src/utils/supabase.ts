
import { supabase, checkConnection } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Cache environment variables to avoid repeated lookups
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ushmvfuczmqjjtwnqebp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG12ZnVjem1xamp0d25xZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzUwNzYsImV4cCI6MjA1Njg1MTA3Nn0.XJ-Xt_WOcu1Jbx6qFrMfJ265mPxNFo5dwj0eQb-PUUQ';

// Validate config
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  created_at: string;
  updated_at: string;
}

export interface StudentProfile extends Profile {
  register_number: string;
  roll_number: string;
  department: string;
  semester: number;
  class_id: string;
}

export interface TeacherProfile extends Profile {
  employee_id: string;
  department: string;
  designation: string;
}

export interface Class {
  id: string;
  name: string;
  course_code: string;
  department: string;
  semester: number;
  teacher_id: string;
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  created_by: string;
  qr_secret: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  timestamp: string;
  created_at: string;
}

// Error handler for Supabase operations
export const handleSupabaseError = (error: any, customMessage?: string) => {
  console.error('Supabase error:', error);
  toast.error(customMessage || error.message || 'An error occurred');
  return null;
};

// Helper function to check if a user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
};

// Helper function to get the current user's profile
export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      handleSupabaseError(error, 'Failed to fetch user profile');
      return null;
    }

    return data as Profile;
  } catch (error) {
    handleSupabaseError(error, 'Failed to get current user profile');
    return null;
  }
};

// Re-export the connection check from the client for convenience
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Implement a more robust connection check with retry logic
    const maxRetries = 3;
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        console.log(`Connection attempt ${retries + 1} of ${maxRetries + 1}`);
        const isConnected = await checkConnection();
        
        if (isConnected) {
          console.log('Supabase connection successful');
          return true;
        }
        
        // If error is related to connection, try again
        console.warn(`Connection attempt ${retries + 1} failed`);
        retries++;
        
        if (retries <= maxRetries) {
          // Wait before retrying with exponential backoff
          const delay = 1000 * Math.pow(2, retries - 1); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (innerError) {
        console.error(`Connection attempt ${retries + 1} error:`, innerError);
        retries++;
        
        if (retries <= maxRetries) {
          const delay = 1000 * Math.pow(2, retries - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('All connection attempts failed');
    return false;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
};
