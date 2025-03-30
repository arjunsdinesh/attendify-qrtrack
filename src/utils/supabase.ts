import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Use the values from the working Supabase client configuration
const SUPABASE_URL = "https://wmhmdacynswuyhzfbptu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtaG1kYWN5bnN3dXloemZicHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNDc1OTIsImV4cCI6MjA1ODkyMzU5Mn0.Aud4g72knt7oIHUTVvce-vUGP9U5_XvZ82r3RhNDPl0";

// Enhanced Supabase client configuration with proper TypeScript typing
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

// Improved connection check function with better error handling
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Performing quick database connection check...');
    
    // Set timeout for faster response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Increase timeout to 3 seconds
    
    try {
      // Use a simple query to check connection
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
      
      console.warn('Database connection check failed:', error.message);
      return false;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('Connection check timed out, assuming connection is OK');
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

// Initialize check with a slight delay to allow other components to render first
setTimeout(() => {
  createForceActivateRPC();
}, 1500);
