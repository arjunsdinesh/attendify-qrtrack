
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { QRGenerator } from './QRGenerator';
import { SessionForm } from './SessionForm';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui-components';
import { forceSessionActivation, ensureSessionActive } from '@/utils/sessionUtils';

interface SessionControlsProps {
  userId: string;
}

interface ClassData {
  name: string;
  [key: string]: any;
}

export const SessionControls = ({ userId }: SessionControlsProps) => {
  const [searchParams] = useSearchParams();
  const preselectedClassId = searchParams.get('class');
  
  const [classId, setClassId] = useState<string>(preselectedClassId || '');
  const [className, setClassName] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(false);
  const [checkingActiveSession, setCheckingActiveSession] = useState<boolean>(true);
  const [initialLoadTimeout, setInitialLoadTimeout] = useState<boolean>(false);

  // Set a timeout for initial load
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setInitialLoadTimeout(true);
      setCheckingActiveSession(false);
    }, 600);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Get class name from class data
  const getClassNameFromData = (data: any): string => {
    if (!data?.classes) return 'Unknown Class';
    
    if (Array.isArray(data.classes)) {
      const firstClass = data.classes[0] as ClassData | undefined;
      return firstClass?.name || 'Unknown Class';
    } 
    
    if (typeof data.classes === 'object' && data.classes !== null && 'name' in data.classes) {
      return (data.classes as ClassData).name;
    }
    
    return 'Unknown Class';
  };

  // Check for active session
  const checkForActiveSession = async () => {
    if (!userId) {
      setCheckingActiveSession(false);
      return;
    }
      
    try {
      setCheckingActiveSession(true);
      
      const sessionTimeoutId = setTimeout(() => {
        setCheckingActiveSession(false);
      }, 750);
      
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, classes(name)')
        .eq('created_by', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      clearTimeout(sessionTimeoutId);
      
      if (error) throw error;
      
      if (data) {
        setSessionId(data.id);
        setClassId(data.class_id);
        setClassName(getClassNameFromData(data));
        setActive(true);

        setTimeout(() => {
          ensureSessionActive(data.id).catch(() => {});
        }, 0);
      }
    } catch (error) {
      console.error('Error checking for active session:', error);
    } finally {
      setCheckingActiveSession(false);
    }
  };

  // Initial check for active session
  useEffect(() => {
    if (userId) {
      setTimeout(() => {
        checkForActiveSession();
      }, 100);
    } else {
      setCheckingActiveSession(false);
    }
  }, [userId]);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userId) {
        setIsLoadingClasses(false);
        return;
      }
      
      const classesTimeoutId = setTimeout(() => {
        setIsLoadingClasses(false);
      }, 800);
      
      try {
        setIsLoadingClasses(true);
        
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', userId as any);
        
        clearTimeout(classesTimeoutId);
        
        if (error) throw error;
        
        setClasses(data || []);
        
        if (preselectedClassId && data) {
          const selectedClass = data.find(c => c.id === preselectedClassId);
          if (selectedClass) {
            setClassName(selectedClass.name);
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    
    if (userId) {
      fetchClasses();
    }
  }, [userId, preselectedClassId]);

  // Generate a secure random secret
  const generateSecret = (): string => {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(16)).join('');
  };

  // Start a new QR session
  const startQRGenerator = async (selectedClassId: string, selectedClassName: string) => {
    try {
      if (!selectedClassId || !userId) {
        toast.error(selectedClassId ? 'User authentication required' : 'Please select a class');
        return;
      }
      
      setIsLoading(true);
      setClassId(selectedClassId);
      setClassName(selectedClassName);
      
      // Deactivate any existing sessions
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('created_by', userId)
        .eq('is_active', true);
      
      const secret = generateSecret();
      
      // Create new session
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          created_by: userId,
          class_id: selectedClassId,
          qr_secret: secret,
          is_active: true,
          start_time: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (error || !data) {
        throw error || new Error('No data returned from session creation');
      }
      
      // Ensure session is active using multiple methods
      try {
        await Promise.all([
          supabase.rpc('force_activate_session', { session_id: data.id }),
          forceSessionActivation(data.id),
          supabase
            .from('attendance_sessions')
            .update({ is_active: true, end_time: null })
            .eq('id', data.id)
        ]);
      } catch (activationError) {
        console.error('Error during activation:', activationError);
        await supabase
          .from('attendance_sessions')
          .update({ is_active: true, end_time: null })
          .eq('id', data.id);
      }
      
      setSessionId(data.id);
      setActive(true);
      
      toast.success('New attendance tracking session started');
    } catch (error: any) {
      console.error('Error starting attendance tracking:', error);
      toast.error('Failed to start attendance tracking: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Stop the current QR session
  const stopQRGenerator = async () => {
    try {
      if (!sessionId) return;
      
      setIsLoading(true);
      
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('id', sessionId as any);
      
      if (error) throw error;
      
      setActive(false);
      setSessionId(null);
      toast.success('Attendance tracking stopped');
    } catch (error: any) {
      console.error('Error stopping attendance tracking:', error);
      toast.error('Failed to stop attendance tracking');
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialLoadTimeout && checkingActiveSession) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
          <span className="ml-2">Loading session...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Attendance Session</CardTitle>
        <CardDescription>
          {active 
            ? `QR code for ${className}. Refreshes automatically.`
            : 'Generate a QR code for students to scan and mark attendance.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {!active ? (
          <SessionForm 
            classes={classes}
            isLoadingClasses={isLoadingClasses}
            onStartSession={startQRGenerator}
            isLoading={isLoading}
            selectedClassId={preselectedClassId || ''}
          />
        ) : (
          <QRGenerator 
            sessionId={sessionId!} 
            className={className} 
            onEndSession={stopQRGenerator} 
          />
        )}
      </CardContent>
    </Card>
  );
};
