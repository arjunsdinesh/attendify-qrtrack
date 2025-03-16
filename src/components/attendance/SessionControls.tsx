
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { QRGenerator } from './QRGenerator';
import { SessionForm } from './SessionForm';
import { useSearchParams } from 'react-router-dom';

interface SessionControlsProps {
  userId: string;
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
      
      // First check if there's an existing active session for this class
      const { data: existingSession, error: existingSessionError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('class_id', selectedClassId)
        .eq('is_active', true)
        .maybeSingle();
        
      if (existingSessionError) {
        console.error('Error checking existing sessions:', existingSessionError);
        throw existingSessionError;
      }
      
      // If there's an existing active session, reuse it
      if (existingSession) {
        setSessionId(existingSession.id);
        setActive(true);
        toast.success('Continuing existing attendance session');
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
        .single();
      
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
