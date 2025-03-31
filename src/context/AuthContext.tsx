import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, StudentProfile, TeacherProfile } from '@/utils/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: Profile | null;
  studentProfile: StudentProfile | null;
  teacherProfile: TeacherProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, role: 'student' | 'teacher', fullName: string, registerNumber?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setInitialRole: (role: 'student' | 'teacher') => void;
  initialRole: 'student' | 'teacher';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialRole, setInitialRole] = useState<'student' | 'teacher'>('student');
  const navigate = useNavigate();

  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    let isMounted = true;
    let profileInitialized = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        if (event === 'SIGNED_IN' && session) {
          if (!profileInitialized) {
            profileInitialized = true;
            setTimeout(() => {
              fetchUserProfile(session.user.id);
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setStudentProfile(null);
          setTeacherProfile(null);
          setLoading(false);
        }
      }
    );

    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && isMounted) {
          if (!profileInitialized) {
            profileInitialized = true;
            fetchUserProfile(session.user.id);
          }
        } else if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Session error:", error);
        if (isMounted) setLoading(false);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const fetchTimeout = setTimeout(() => {
        setLoading(false);
      }, 1000);
      
      const [profileResponse, studentResponse, teacherResponse] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('student_profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('teacher_profiles').select('*').eq('id', userId).maybeSingle()
      ]);
      
      clearTimeout(fetchTimeout);
      
      if (profileResponse.status === 'fulfilled' && profileResponse.value.data) {
        const profileData = profileResponse.value.data as any;
        setUser(profileData as Profile);
        
        if (profileData.role === 'student' && 
            studentResponse.status === 'fulfilled' && 
            studentResponse.value.data) {
          setStudentProfile(studentResponse.value.data as any);
        } else if (profileData.role === 'teacher' && 
                   teacherResponse.status === 'fulfilled' && 
                   teacherResponse.value.data) {
          setTeacherProfile(teacherResponse.value.data as any);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("Attempting to sign in with email:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Sign in error detected:", error.message);
        throw error;
      }

      if (data.user) {
        console.log("Authentication successful, fetching profile");
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error fetching profile after login:', profileError);
          // Continue even if profile fetch fails - auth is still successful
        }
        
        console.log('Login successful, redirecting based on role:', profileData?.role);
        if (profileData?.role === 'student') {
          toast.success('Welcome back, student!');
          navigate('/student-dashboard');
        } else if (profileData?.role === 'teacher') {
          toast.success('Welcome back, teacher!');
          navigate('/teacher-dashboard');
        } else {
          // Default fallback
          toast.success('Welcome back!');
          navigate('/');
        }
        
        return data;
      }
      
      return null; // Return null if no user data
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.message?.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
        throw error;
      } else {
        throw error; // Rethrow for component-level handling
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, role: 'student' | 'teacher', fullName: string, registerNumber?: string) => {
    try {
      setLoading(true);
      
      if (role === 'student' && (!registerNumber || registerNumber.trim() === '')) {
        throw new Error('University register number is required for students');
      }
      
      if (role === 'student' && registerNumber) {
        const { data: existingUser, error: searchError } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('register_number', registerNumber as any)
          .maybeSingle();
          
        if (searchError) {
          console.error('Error checking register number:', searchError);
        }
        
        if (existingUser) {
          throw new Error('This university register number is already registered');
        }
      }
      
      const { error: connectionError } = await supabase.from('profiles').select('count').limit(1);
      if (connectionError) {
        throw new Error(`Failed to connect to the database: ${connectionError.message}. Please check your Supabase configuration.`);
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role
          } as any);

        if (profileError) throw profileError;
        
        if (role === 'student') {
          const { error: studentError } = await supabase
            .from('student_profiles')
            .insert({
              id: data.user.id,
              register_number: registerNumber || '',
              roll_number: '',
              department: '',
              semester: 1
            } as any);
          
          if (studentError) throw studentError;
        } else if (role === 'teacher') {
          const { error: teacherError } = await supabase
            .from('teacher_profiles')
            .insert({
              id: data.user.id,
              employee_id: '',
              department: '',
              designation: ''
            } as any);
          
          if (teacherError) throw teacherError;
        }

        toast.success('Account created successfully! Please check your email for verification.');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error; // Rethrow for component-level handling
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        studentProfile,
        teacherProfile,
        loading,
        signIn,
        signUp,
        signOut,
        initialRole,
        setInitialRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
