import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { QRGenerator } from './QRGenerator';
import { SessionForm } from './SessionForm';
import { useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui-components';

interface SessionControlsProps {
  userId: string;
}

// Define the expected shape of classes data from Supabase
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

  // Check for an active session when component mounts
  useEffect(() => {
    const checkForActiveSession = async () => {
      if (!userId) return;
      
      try {
        setCheckingActiveSession(true);
        
        // Check if the teacher has any active sessions
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('id, class_id, classes(name)')
          .eq('created_by', userId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) throw error;
        
        // If an active session exists, restore it
        if (data) {
          setSessionId(data.id);
          setClassId(data.class_id);
          
          // Extract class name - safely handling the type
          if (data.classes) {
            let classNameValue = 'Unknown Class';
            
            // Handle case where it might be an array due to Supabase join
            if (Array.isArray(data.classes)) {
              const firstClass = data.classes[0] as ClassData | undefined;
              classNameValue = firstClass?.name || 'Unknown Class';
            } 
            // Handle case where it's a single object
            else if (typeof data.classes === 'object' && data.classes !== null && 'name' in data.classes) {
              classNameValue = (data.classes as ClassData).name;
            }
            
            setClassName(classNameValue);
          } else {
            setClassName('Unknown Class');
          }
          
          setActive(true);
        }
      } catch (error: any) {
        console.error('Error checking active sessions:', error);
      } finally {
        setCheckingActiveSession(false);
      }
    };
    
    checkForActiveSession();
  }, [userId]);

  // Fetch teacher's classes when component mounts
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userId) return;
      
      try {
        setIsLoadingClasses(true);
        
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', userId);
        
        if (error) throw error;
        
        setClasses(data || []);
        
        // If we have a preselected class ID, set the class name as well
        if (preselectedClassId && data) {
          const selectedClass = data.find(c => c.id === preselectedClassId);
          if (selectedClass) {
            setClassName(selectedClass.name);
          }
        }
      } catch (error: any) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setIsLoadingClasses(false);
      }
    };
    
    fetchClasses();
  }, [userId, preselectedClassId]);

  // Generate a cryptographically secure random secret
  const generateSecret = () => {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(16)).join('');
  };

  // Start generating QR codes
  const startQRGenerator = async (selectedClassId: string, selectedClassName: string) => {
    try {
      if (!selectedClassId) {
        toast.error('Please select a class');
        return;
      }
      
      if (!userId) {
        toast.error('User authentication required');
        return;
      }
      
      setIsLoading(true);
      setClassId(selectedClassId);
      setClassName(selectedClassName);
      
      // Check if the teacher already has an active session
      const { data: existingSessions, error: checkError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('created_by', userId)
        .eq('is_active', true);
      
      if (checkError) {
        console.error('Error checking existing sessions:', checkError);
        throw new Error('Failed to check existing sessions');
      }
      
      // If there's an existing session, use it instead of creating a new one
      if (existingSessions && existingSessions.length > 0) {
        setSessionId(existingSessions[0].id);
        setActive(true);
        toast.info('Resumed existing attendance session');
        return;
      }
      
      // Generate a new secret for this session
      const secret = generateSecret();
      
      console.log('Creating session with:', {
        created_by: userId,
        class_id: selectedClassId,
        qr_secret: secret,
        date: new Date().toISOString().split('T')[0]
      });
      
      // Create a new session
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
        .maybeSingle();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from session creation');
      }
      
      console.log('Session created successfully:', data);
      setSessionId(data.id);
      setActive(true);
      
      toast.success('Attendance tracking started');
    } catch (error: any) {
      console.error('Error starting attendance tracking:', error);
      toast.error('Failed to start attendance tracking: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Stop generating QR codes
  const stopQRGenerator = async () => {
    try {
      if (!sessionId) return;
      
      setIsLoading(true);
      
      // Update the session to mark it as inactive
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('id', sessionId);
      
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

  if (checkingActiveSession) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
          <span className="ml-2">Checking active sessions...</span>
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
