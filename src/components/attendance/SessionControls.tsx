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

  // Function to attempt to activate a session by its ID
  const checkForActiveSession = async () => {
    if (!userId) return;
      
    try {
      setCheckingActiveSession(true);
      
      // Check if the teacher has any active sessions
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, classes(name)')
        .eq('created_by', userId as any)
        .eq('is_active', true as any)
        .maybeSingle();
      
      if (error) throw error;
      
      // If an active session exists, restore it
      if (data) {
        console.log('Found active session:', data);
        setSessionId(data?.id);
        setClassId(data?.class_id);
        
        // Extract class name - safely handling the type
        if (data?.classes) {
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

        // Force activate the session to ensure it's truly active
        const { error: activateError } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true as any,
            end_time: null 
          } as any)
          .eq('id', data.id as any);
          
        if (activateError) {
          console.error('Error ensuring session activation:', activateError);
        } else {
          console.log('Session activation reinforced');
        }
      } else {
        console.log('No active sessions found');
      }
    } catch (error: any) {
      console.error('Error checking active sessions:', error);
    } finally {
      setCheckingActiveSession(false);
    }
  };

  // Check for an active session when component mounts
  useEffect(() => {
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
          .eq('teacher_id', userId as any);
        
        if (error) throw error;
        
        setClasses(data || []);
        
        // If we have a preselected class ID, set the class name as well
        if (preselectedClassId && data) {
          const selectedClass = data.find(c => c.id === preselectedClassId);
          if (selectedClass) {
            setClassName(selectedClass?.name);
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

  // Start generating QR codes - enhanced with better activation assurance
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
      
      // First, properly deactivate any existing active sessions for this teacher
      const { error: deactivateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false as any, 
          end_time: new Date().toISOString() 
        } as any)
        .eq('created_by', userId as any)
        .eq('is_active', true as any);
        
      if (deactivateError) {
        console.error('Error deactivating existing sessions:', deactivateError);
        // Continue anyway, as this is not a critical error
      }
      
      // Generate a new secret for this session
      const secret = generateSecret();
      
      console.log('Creating new session with:', {
        created_by: userId,
        class_id: selectedClassId,
        qr_secret: secret,
        date: new Date().toISOString().split('T')[0],
        is_active: true
      });
      
      // Create a new session with is_active explicitly set to true
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          created_by: userId as any,
          class_id: selectedClassId,
          qr_secret: secret,
          is_active: true as any,
          start_time: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0]
        } as any)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from session creation');
      }
      
      console.log('Session created successfully:', data);
      
      // Double-check that the session is active with retry logic
      let isSessionActive = false;
      const maxRetries = 3;
      let retryCount = 0;
      
      while (!isSessionActive && retryCount < maxRetries) {
        const { data: checkData, error: checkError } = await supabase
          .from('attendance_sessions')
          .select('is_active')
          .eq('id', data.id)
          .single();
          
        if (checkError) {
          console.error(`Error checking session status (attempt ${retryCount + 1}):`, checkError);
        } else {
          console.log(`Session active status (attempt ${retryCount + 1}):`, checkData?.is_active);
          if (checkData?.is_active) {
            isSessionActive = true;
            break;
          } else {
            // If not active, try to update it and wait briefly
            console.log(`Session not active, attempting to activate (attempt ${retryCount + 1})...`);
            const { error: updateError } = await supabase
              .from('attendance_sessions')
              .update({ is_active: true as any })
              .eq('id', data.id);
              
            if (updateError) {
              console.error(`Error updating session status (attempt ${retryCount + 1}):`, updateError);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        retryCount++;
      }
      
      if (!isSessionActive) {
        console.warn('Could not verify session as active after multiple attempts');
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

  // Stop generating QR codes
  const stopQRGenerator = async () => {
    try {
      if (!sessionId) return;
      
      setIsLoading(true);
      
      // Update the session to mark it as inactive
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        } as any)
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
