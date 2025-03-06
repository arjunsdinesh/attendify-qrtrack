
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { toast } from 'sonner';
import { QRCodeSVG } from 'react-qr-code';

interface QRCodeGeneratorProps {
  sessionId: string;
  classId: string;
  className: string;
}

const QRCodeGenerator = ({ sessionId, classId, className }: QRCodeGeneratorProps) => {
  const { user } = useAuth();
  const [qrValue, setQrValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  
  // Generate a cryptographically secure random secret
  const generateSecret = () => {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(16)).join('');
  };

  // Create a secure signature for the QR data
  const createSignature = (data: any, secret: string) => {
    const stringData = JSON.stringify(data);
    // In a real app, you would use a proper crypto library to create a HMAC
    // This is a simplified version for demonstration
    return btoa(stringData + secret).substring(0, 16);
  };

  // Generate new QR code data
  const generateQRData = async () => {
    try {
      if (!user) return;
      
      setGenerating(true);
      
      // Get the current session's secret from the database
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('qr_secret')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      const secret = sessionData.qr_secret;
      
      // Create the QR code data
      const timestamp = Date.now();
      const qrData = {
        sessionId,
        timestamp,
        secret: secret.substring(0, 8), // Only share a part of the secret
        classId
      };
      
      // Generate a signature to verify the QR code hasn't been tampered with
      const signature = createSignature(qrData, secret);
      
      const finalData = { ...qrData, signature };
      setQrValue(JSON.stringify(finalData));
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  };

  // Start generating QR codes
  const startQRGenerator = async () => {
    try {
      setActive(true);
      
      // Generate a new secret for this session
      const secret = generateSecret();
      
      // Update the session with the new secret and mark it as active
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ qr_secret: secret, is_active: true })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Generate the first QR code
      await generateQRData();
      
      toast.success('Attendance tracking started');
    } catch (error) {
      console.error('Error starting attendance tracking:', error);
      toast.error('Failed to start attendance tracking');
      setActive(false);
    }
  };

  // Stop generating QR codes
  const stopQRGenerator = async () => {
    try {
      setActive(false);
      
      // Update the session to mark it as inactive
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      toast.success('Attendance tracking stopped');
    } catch (error) {
      console.error('Error stopping attendance tracking:', error);
      toast.error('Failed to stop attendance tracking');
    }
  };

  // Check if session is already active when component loads
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('is_active, qr_secret')
          .eq('id', sessionId)
          .single();
        
        if (error) throw error;
        
        if (data.is_active) {
          setActive(true);
          await generateQRData();
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    };
    
    checkSessionStatus();
  }, [sessionId]);

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
  }, [active]);

  // Display a countdown animation ring around the QR code
  const progressPercentage = useMemo(() => {
    return (timeLeft / 5) * 100;
  }, [timeLeft]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Attendance QR Code</CardTitle>
        <CardDescription>
          {active 
            ? `For ${className}. Refreshes in ${timeLeft} seconds.`
            : 'Start tracking attendance for this session.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {active ? (
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full" 
              style={{
                background: `conic-gradient(#3b82f6 ${progressPercentage}%, transparent 0%)`,
                padding: '0.5rem'
              }}
            />
            <div className="bg-white rounded-xl p-2 relative z-10 qr-refresh-animation">
              {qrValue ? (
                <QRCodeSVG 
                  value={qrValue}
                  size={200}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
              ) : (
                <div className="h-[200px] w-[200px] flex items-center justify-center bg-gray-100">
                  <LoadingSpinner className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 p-8">
            <div className="text-4xl text-muted-foreground mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M7 7h.01" />
                <path d="M17 7h.01" />
                <path d="M7 17h.01" />
                <path d="M11 7h2" />
                <path d="M11 11h1" />
                <path d="M13 17h4" />
                <path d="M17 11h.01" />
                <path d="M11 17h.01" />
              </svg>
            </div>
            <p className="text-center text-muted-foreground">
              QR code will be generated and automatically refresh every 5 seconds when active.
            </p>
          </div>
        )}
        
        <Button 
          onClick={active ? stopQRGenerator : startQRGenerator}
          className={`w-full ${active ? 'bg-destructive hover:bg-destructive/90' : 'bg-brand-500 hover:bg-brand-600'}`}
          disabled={generating}
        >
          {generating ? <LoadingSpinner className="h-4 w-4" /> : (active ? 'Stop Tracking' : 'Start Tracking')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
