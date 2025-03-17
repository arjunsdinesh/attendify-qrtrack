import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRGeneratorProps {
  sessionId: string;
  className: string;
  onEndSession: () => void;
}

export const QRGenerator = ({ sessionId, className, onEndSession }: QRGeneratorProps) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(30); // 30 seconds
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [refreshingQR, setRefreshingQR] = useState<boolean>(false);

  // Force activate session - simplified
  const forceActivateSession = useCallback(async () => {
    try {
      console.log('Force activating session:', sessionId);
      setGenerating(true);
      
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true,
          end_time: null 
        })
        .eq('id', sessionId);
        
      if (error) {
        console.error('Error activating session:', error);
        setSessionActive(false);
        setError('Failed to activate session');
        return false;
      }
      
      console.log('Session activated successfully');
      setSessionActive(true);
      return true;
      
    } catch (error) {
      console.error('Error in forceActivateSession:', error);
      setError('Failed to activate session');
      return false;
    } finally {
      setGenerating(false);
    }
  }, [sessionId]);

  // Generate new QR code data with simplified approach
  const generateQRData = useCallback(async () => {
    // Prevent multiple simultaneous QR generation attempts
    if (refreshingQR) {
      console.log('Already refreshing QR, skipping this request');
      return;
    }
    
    try {
      if (!sessionId) {
        console.error('No sessionId provided to QRGenerator');
        setError('Missing session ID');
        return;
      }
      
      setRefreshingQR(true);
      setGenerating(true);
      setError(null);
      setConnectionError(false);
      
      console.log('Generating QR code for session:', sessionId);
      
      // Always force activate the session before generating QR
      await forceActivateSession();
      
      // Create the QR code data with expiration time
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
      // Create a simple QR data format that matches what the scanner expects
      const qrData = {
        sessionId,
        timestamp,
        expiresAt,
        isActive: true // Explicitly include activation status
      };
      
      console.log('Generated QR data:', {
        sessionId: qrData.sessionId,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt,
        isActive: qrData.isActive
      });
      
      setQrValue(JSON.stringify(qrData));
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
      toast.error('Error generating QR code');
    } finally {
      setGenerating(false);
      setRefreshingQR(false);
    }
  }, [sessionId, timeLeft, forceActivateSession, refreshingQR]);

  // Set up keep-alive ping for session
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;
    
    // Create a ping interval (every 15 seconds)
    if (sessionId) {
      console.log('Setting up session keep-alive ping');
      pingInterval = setInterval(async () => {
        try {
          console.log('Sending keep-alive ping for session:', sessionId);
          
          const { error } = await supabase
            .from('attendance_sessions')
            .update({ 
              is_active: true, 
              end_time: null 
            })
            .eq('id', sessionId);
            
          if (error) {
            console.error('Error in keep-alive ping:', error);
            await forceActivateSession();
          } else {
            setSessionActive(true);
          }
        } catch (error) {
          console.error('Exception in keep-alive ping:', error);
        }
      }, 15000); // Every 15 seconds
    }
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [sessionId, forceActivateSession]);

  // Timer for QR code refresh - fixed to avoid continuous refreshing
  useEffect(() => {
    // Initial QR code generation
    generateQRData();
    
    // Set up timer to count down from 30 seconds
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time to generate a new QR code
          generateQRData();
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);  // Empty dependency array means this only runs once on mount

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => forceActivateSession()}
              disabled={generating}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {!sessionActive && !error && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>Session is inactive. Students may not be able to scan in.</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => forceActivateSession()}
              disabled={generating}
            >
              Activate
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="relative p-2 bg-white rounded-lg shadow-sm border">
        {qrValue && !error ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <QRCode 
              value={qrValue}
              size={200}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        ) : (
          <div className="h-[200px] w-[200px] flex items-center justify-center bg-gray-100">
            {generating ? (
              <LoadingSpinner className="h-8 w-8" />
            ) : error ? (
              <div className="text-center text-red-500 p-4">{error}</div>
            ) : (
              <LoadingSpinner className="h-8 w-8" />
            )}
          </div>
        )}
        <div className="absolute -bottom-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
          {timeLeft}s
        </div>
      </div>
      <p className="text-sm text-center text-muted-foreground">
        Show this QR code to your students. It will refresh automatically every 30 seconds.
      </p>
      <Button 
        onClick={() => {
          // Manual refresh
          setTimeLeft(30);
          generateQRData();
        }} 
        className="w-full bg-green-600 hover:bg-green-700 mt-2"
        disabled={generating || refreshingQR}
      >
        {generating ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
        Refresh QR Code
      </Button>
      <Button 
        onClick={onEndSession}
        className="w-full bg-destructive hover:bg-destructive/90"
      >
        End Session
      </Button>
    </div>
  );
};
