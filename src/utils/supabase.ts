import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Retrieve Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate config
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

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

// Function to check Supabase connection
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
};
