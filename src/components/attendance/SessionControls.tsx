
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { QRGenerator } from './QRGenerator';
import { SessionForm } from './SessionForm';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionControlsProps {
  userId: string;
}

export const SessionControls = ({ userId }: SessionControlsProps) => {
  const [classId, setClassId] = useState<string>('');
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
      } catch (error: any) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setIsLoadingClasses(false);
      }
    };
    
    fetchClasses();
  }, [userId]);

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
      
      // Generate a new secret for this session
      const secret = generateSecret();
      
      console.log('Creating session with:', {
        created_by: userId,
        class_id: selectedClassId, // Now using the actual UUID from the classes table
        qr_secret: secret,
        date: new Date().toISOString().split('T')[0]
      });
      
      // Create a new session with the correct column names based on the database schema
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          created_by: userId,
          class_id: selectedClassId, // Now using the actual UUID from the classes table
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
