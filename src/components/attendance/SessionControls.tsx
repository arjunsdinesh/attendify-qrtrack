
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

  const checkForActiveSession = async () => {
    if (!userId) return;
      
    try {
      setCheckingActiveSession(true);
      
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, classes(name)')
        .eq('created_by', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        console.log('Found active session:', data);
        setSessionId(data?.id);
        setClassId(data?.class_id);
        
        if (data?.classes) {
          let classNameValue = 'Unknown Class';
          
          if (Array.isArray(data.classes)) {
            const firstClass = data.classes[0] as ClassData | undefined;
            classNameValue = firstClass?.name || 'Unknown Class';
          } else if (typeof data.classes === 'object' && data.classes !== null && 'name' in data.classes) {
            classNameValue = (data.classes as ClassData).name;
          }
          
          setClassName(classNameValue);
        } else {
          setClassName('Unknown Class');
        }
        
        setActive(true);

        // Ensure the session is still marked as active
        const { error: activateError } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true,
            end_time: null 
          })
          .eq('id', data.id);
        
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

  useEffect(() => {
    checkForActiveSession();
  }, [userId]);

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

  const generateSecret = () => {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(16)).join('');
  };

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
      
      // Deactivate any existing active sessions
      const { error: deactivateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
        .eq('created_by', userId)
        .eq('is_active', true);
        
      if (deactivateError) {
        console.error('Error deactivating existing sessions:', deactivateError);
      }
      
      const secret = generateSecret();
      
      console.log('Creating new session with:', {
        created_by: userId,
        class_id: selectedClassId,
        qr_secret: secret,
        date: new Date().toISOString().split('T')[0],
        is_active: true
      });
      
      // Create the new session with is_active explicitly set to true
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
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from session creation');
      }
      
      console.log('Session created successfully:', data);
      
      // Immediate verification and forced activation if needed
      let isSessionActive = false;
      const maxRetries = 3;
      let retryCount = 0;
      
      while (!isSessionActive && retryCount < maxRetries) {
        // Check if the session is active
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
            console.log(`Session not active, forcefully activating (attempt ${retryCount + 1})...`);
            
            // Force activate with a direct update - explicit boolean casting
            const { error: updateError } = await supabase
              .from('attendance_sessions')
              .update({ 
                is_active: true,
                end_time: null
              })
              .eq('id', data.id);
              
            if (updateError) {
              console.error(`Error updating session status (attempt ${retryCount + 1}):`, updateError);
            }
            
            // Wait a moment before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        retryCount++;
      }
      
      if (!isSessionActive) {
        console.warn('Could not verify session as active after multiple attempts, making final attempt');
        
        // Final attempt with a direct update, no casting
        await supabase.rpc('force_activate_session', { session_id: data.id })
          .then(({ error }) => {
            if (error) {
              console.error('RPC activation failed:', error);
            } else {
              console.log('RPC activation completed');
            }
          });
          
        // Final verification
        const { data: finalCheck } = await supabase
          .from('attendance_sessions')
          .select('is_active')
          .eq('id', data.id)
          .maybeSingle();
          
        console.log('Final activation status check:', finalCheck?.is_active);
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

  const stopQRGenerator = async () => {
    try {
      if (!sessionId) return;
      
      setIsLoading(true);
      
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
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
