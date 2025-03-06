
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
  signUp: (email: string, password: string, role: 'student' | 'teacher', fullName: string) => Promise<void>;
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

  // Check active session
  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        toast.error('Session error. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setStudentProfile(null);
          setTeacherProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUser(data as Profile);

      // Fetch role-specific profile
      if (data.role === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (studentError) throw studentError;
        setStudentProfile(studentData as StudentProfile);
      } else if (data.role === 'teacher') {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (teacherError) throw teacherError;
        setTeacherProfile(teacherData as TeacherProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserProfile(data.user.id);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
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
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, role: 'student' | 'teacher', fullName: string) => {
    try {
      setLoading(true);
      
      // Create auth user
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
        // Create profile entry
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
        
        // Create role-specific profile entry
        if (role === 'student') {
          const { error: studentError } = await supabase
            .from('student_profiles')
            .insert([
              {
                id: data.user.id,
                register_number: '',
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
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
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
