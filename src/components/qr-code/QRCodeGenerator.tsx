import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { QRCodeDisplay } from './QRCodeDisplay';
import { SessionStatusAlert } from './SessionStatusAlert';
import { QRControlButtons } from './QRControlButtons';
import { useQRCodeGenerator } from '@/hooks/useQRCodeGenerator';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';

interface QRCodeGeneratorProps {
  sessionId: string;
  classId: string;
  className: string;
}

const QRCodeGenerator = ({ sessionId, classId, className }: QRCodeGeneratorProps) => {
  const { user } = useAuth();
  const [active, setActive] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(5);
  
  // Get session management functionality
  const {
    sessionStatus,
    generating,
    error,
    setError,
    forceActivateSession,
    checkSessionStatus,
    startSession,
    stopSession,
    setSessionStatus
  } = useSessionManagement({ sessionId });
  
  // Get QR code generation functionality
  const {
    qrValue,
    refreshing,
    generateQRData
  } = useQRCodeGenerator({ 
    sessionId, 
    classId, 
    timeLeft 
  });
  
  // Set up session keep-alive
  useSessionKeepAlive({
    sessionId,
    active,
    forceActivateSession,
    setSessionStatus,
    setError
  });
  
  // Display a countdown animation ring around the QR code
  const progressPercentage = useMemo(() => {
    return (timeLeft / 5) * 100;
  }, [timeLeft]);
  
  // Handle starting the QR generator session
  const handleStartSession = async () => {
    const success = await startSession();
    if (success) {
      setActive(true);
      generateQRData();
    }
  };
  
  // Handle stopping the QR generator session
  const handleStopSession = async () => {
    const success = await stopSession();
    if (success) {
      setActive(false);
    }
  };
  
  // Handle refreshing the QR code
  const handleRefreshQR = () => {
    setTimeLeft(5);
    // Force check session status before generating new QR
    checkSessionStatus().then(() => {
      generateQRData();
    });
  };
  
  // Check if session is already active when component loads
  useEffect(() => {
    const initialSetup = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('is_active, qr_secret')
          .eq('id', sessionId)
          .single();
        
        if (error) {
          console.error('Error checking initial session status:', error);
          // Try to force activate on error
          await forceActivateSession();
        } else {
          setSessionStatus(data?.is_active || false);
          
          if (data?.is_active) {
            setActive(true);
          } else {
            // Try to activate anyway to ensure it's active
            await forceActivateSession();
          }
        }
        
        // Generate initial QR code regardless of status
        await generateQRData();
      } catch (error) {
        console.error('Error in initialSetup:', error);
      }
    };
    
    initialSetup();
  }, [sessionId, generateQRData, forceActivateSession, setSessionStatus]);
  
  // Timer for QR code refresh with session verification
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (active) {
      // Generate initial QR code when activated if needed
      if (!qrValue) {
        generateQRData();
      }
      
      // Set up timer to count down from 5 seconds
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time to generate a new QR code with session verification
            checkSessionStatus().then(isActive => {
              if (!isActive) {
                // Try to reactivate if needed
                forceActivateSession().then(() => {
                  generateQRData();
                });
              } else {
                generateQRData();
              }
            });
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [active, generateQRData, qrValue, checkSessionStatus, forceActivateSession]);

  // Handle activation button click
  const handleActivate = async () => {
    await forceActivateSession();
    await handleStartSession();
  };

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
        <SessionStatusAlert 
          error={error}
          sessionStatus={sessionStatus}
          onActivate={handleActivate}
          generating={generating}
        />
        
        {active ? (
          <QRCodeDisplay 
            qrValue={qrValue}
            generating={generating}
            timeLeft={timeLeft}
            progressPercentage={progressPercentage}
          />
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
        
        <QRControlButtons 
          active={active}
          onStart={handleStartSession}
          onStop={handleStopSession}
          onRefresh={handleRefreshQR}
          generating={generating}
          refreshing={refreshing}
        />
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
