import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile, StudentProfile, TeacherProfile } from '@/utils/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: Profile | null;
  studentProfile: StudentProfile | null;
  teacherProfile: TeacherProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
    const getSession = async () => {
      try {
        setLoading(true);
        console.log('Getting session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Session found:', session.user.id);
          await fetchUserProfile(session.user.id);
        } else {
          console.log('No session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        toast.error('Session error. Please try again later.');
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (event === 'SIGNED_IN' && session) {
          setLoading(true);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setStudentProfile(null);
          setTeacherProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        throw error;
      }

      if (!data) {
        console.error('No profile found for user:', userId);
        setLoading(false);
        return;
      }

      console.log('Profile data fetched:', data);
      setUser(data as Profile);

      if (data.role === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (studentError) {
          console.error('Error fetching student profile:', studentError);
          setLoading(false);
          throw studentError;
        }
        console.log('Student profile data:', studentData);
        setStudentProfile(studentData as StudentProfile);
      } else if (data.role === 'teacher') {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (teacherError) {
          console.error('Error fetching teacher profile:', teacherError);
          setLoading(false);
          throw teacherError;
        }
        console.log('Teacher profile data:', teacherData);
        setTeacherProfile(teacherData as TeacherProfile);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message === 'Email not confirmed') {
          console.log('Email not confirmed error:', error);
          throw error;
        } else {
          throw error;
        }
      }

      if (data.user) {
        await fetchUserProfile(data.user.id);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        console.log('Login successful, redirecting based on role:', profileData?.role);
        if (profileData?.role === 'student') {
          toast.success('Welcome back, student!');
          navigate('/student-dashboard');
        } else if (profileData?.role === 'teacher') {
          toast.success('Welcome back, teacher!');
          navigate('/teacher-dashboard');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.message?.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
        throw error;
      } else {
        toast.error(error.message || 'Failed to sign in');
        throw error; // Rethrow for component-level handling
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, role: 'student' | 'teacher', fullName: string, registerNumber?: string) => {
    try {
      setLoading(true);
      
      // Validate register number for students
      if (role === 'student' && (!registerNumber || registerNumber.trim() === '')) {
        throw new Error('University register number is required for students');
      }
      
      // Check if register number already exists for students
      if (role === 'student' && registerNumber) {
        const { data: existingUser, error: searchError } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('register_number', registerNumber)
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
          .insert([
            {
              id: data.user.id,
              email,
              full_name: fullName,
              role,
            }
          ]);

        if (profileError) throw profileError;
        
        if (role === 'student') {
          const { error: studentError } = await supabase
            .from('student_profiles')
            .insert([
              {
                id: data.user.id,
                register_number: registerNumber || '',
                roll_number: '',
                department: '',
                semester: 1,
              }
            ]);
          
          if (studentError) throw studentError;
        } else if (role === 'teacher') {
          const { error: teacherError } = await supabase
            .from('teacher_profiles')
            .insert([
              {
                id: data.user.id,
                employee_id: '',
                department: '',
                designation: '',
              }
            ]);
          
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
