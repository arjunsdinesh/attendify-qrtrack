
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import QRCode from 'react-qr-code';

const CreateSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [className, setClassName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  
  // Early return if not a teacher
  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  // Generate a cryptographically secure random secret
  const generateSecret = () => {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(16)).join('');
  };

  // Create a secure signature for the QR data
  const createSignature = (data: any, secret: string) => {
    const stringData = JSON.stringify(data);
    // In a real app, you would use a proper crypto library to create an HMAC
    return btoa(stringData + secret).substring(0, 16);
  };

  // Generate new QR code data
  const generateQRData = async () => {
    try {
      if (!user || !sessionId) return;
      
      setGenerating(true);
      
      // Get the current session's secret from the database
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('qr_secret')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (sessionError) throw sessionError;
      
      const secret = sessionData?.qr_secret || '';
      
      // Create the QR code data
      const timestamp = Date.now();
      const qrData = {
        sessionId,
        timestamp,
        classId: className // Using className as classId for simplicity
      };
      
      // Generate a signature to verify the QR code hasn't been tampered with
      const signature = createSignature(qrData, secret);
      
      const finalData = { ...qrData, signature };
      setQrValue(JSON.stringify(finalData));
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  };

  // Start generating QR codes
  const startQRGenerator = async () => {
    try {
      if (!className.trim()) {
        toast.error('Please enter a class name');
        return;
      }
      
      if (!user || !user.id) {
        toast.error('User authentication required');
        return;
      }
      
      setActive(true);
      
      // Generate a new secret for this session
      const secret = generateSecret();
      
      console.log('Creating session with:', {
        teacher_id: user.id,
        class_name: className,
        qr_secret: secret
      });
      
      // Create a new session
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          teacher_id: user.id,
          class_name: className,
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
      
      // Generate the first QR code
      await generateQRData();
      
      toast.success('Attendance tracking started');
    } catch (error: any) {
      console.error('Error starting attendance tracking:', error);
      toast.error('Failed to start attendance tracking: ' + (error.message || 'Unknown error'));
      setActive(false);
    }
  };

  // Stop generating QR codes
  const stopQRGenerator = async () => {
    try {
      if (!sessionId) return;
      
      setActive(false);
      
      // Update the session to mark it as inactive
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      toast.success('Attendance tracking stopped');
    } catch (error: any) {
      console.error('Error stopping attendance tracking:', error);
      toast.error('Failed to stop attendance tracking');
    }
  };

  // Timer for QR code refresh
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (active) {
      // Set up timer to count down from 5 seconds
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time to generate a new QR code
            generateQRData();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [active, sessionId]);

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/teacher')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Attendance Session</CardTitle>
            <CardDescription>
              {active 
                ? `QR code for ${className}. Refreshes in ${timeLeft} seconds.`
                : 'Generate a QR code for students to scan and mark attendance.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            {!active ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input 
                    id="className" 
                    placeholder="Enter class name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={startQRGenerator}
                  className="w-full"
                  disabled={!className.trim()}
                >
                  Start Session
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative p-2 bg-white rounded-lg shadow-sm border">
                  {qrValue ? (
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                      <QRCode 
                        value={qrValue}
                        size={200}
                        style={{ height: "100%", width: "100%" }}
                      />
                    </div>
                  ) : (
                    <div className="h-[200px] w-[200px] flex items-center justify-center bg-gray-100">
                      <LoadingSpinner className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {timeLeft}s
                  </div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Show this QR code to your students. It will refresh automatically every 5 seconds.
                </p>
                <Button 
                  onClick={stopQRGenerator}
                  className="w-full bg-destructive hover:bg-destructive/90"
                >
                  End Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateSession;
