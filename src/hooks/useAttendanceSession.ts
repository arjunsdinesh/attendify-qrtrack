
import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';

export interface UseAttendanceSessionProps {
  userId: string;
}

export function useAttendanceSession({ userId }: UseAttendanceSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [className, setClassName] = useState<string>('');
  const [classId, setClassId] = useState<string>('');

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
        .maybeSingle();  // Using maybeSingle() instead of single()
        
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
        .maybeSingle(); // Using maybeSingle() instead of single()
      
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

  return {
    sessionId,
    active,
    isLoading,
    className,
    classId,
    startQRGenerator,
    stopQRGenerator
  };
}
