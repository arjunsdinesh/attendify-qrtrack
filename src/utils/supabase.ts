
import { supabase as supabaseClient, checkConnection } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type PostgrestError } from '@supabase/supabase-js';

// Re-export the Supabase client
export const supabase = supabaseClient;

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

export interface StudentProfile {
  id: string;
  register_number: string | null;
  roll_number: string | null;
  department: string | null;
  semester: number | null;
  class_id: string | null;
}

export interface TeacherProfile {
  id: string;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
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
export const handleSupabaseError = (error: PostgrestError | null, customMessage?: string) => {
  if (error) {
    console.error('Supabase error:', error);
    toast.error(customMessage || error.message || 'An error occurred');
  }
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
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, 'Failed to fetch user profile');
      return null;
    }

    console.log('Retrieved user profile:', data);
    return data as unknown as Profile;
  } catch (error) {
    console.error('Failed to get current user profile:', error);
    handleSupabaseError(error as PostgrestError, 'Failed to get current user profile');
    return null;
  }
};

// Helper function to get a student's detailed profile
export const getStudentProfile = async (studentId: string): Promise<{profile: Profile, studentProfile: StudentProfile} | null> => {
  try {
    // Get the base profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();
      
    if (profileError) throw profileError;
    
    // Get the student-specific profile
    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();
      
    if (studentError) throw studentError;
    
    if (!profileData || !studentData) {
      return null;
    }
    
    return {
      profile: profileData as unknown as Profile,
      studentProfile: studentData as unknown as StudentProfile
    };
  } catch (error) {
    console.error('Failed to get student profile:', error);
    handleSupabaseError(error as PostgrestError, 'Failed to get student profile');
    return null;
  }
};

// Function to get attendance records with student details
export const getAttendanceRecordsWithStudentDetails = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        timestamp,
        student:student_id(
          id,
          full_name,
          student_profiles(*)
        )
      `)
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Failed to get attendance records:', error);
    handleSupabaseError(error as PostgrestError, 'Failed to get attendance records');
    return [];
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
