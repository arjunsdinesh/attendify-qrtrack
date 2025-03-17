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
  const [retryCount, setRetryCount] = useState<number>(0);
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [refreshingQR, setRefreshingQR] = useState<boolean>(false);

  // Force activate session - Improved with retry mechanism
  const forceActivateSession = useCallback(async () => {
    try {
      console.log('Force activating session:', sessionId);
      setGenerating(true);
      
      // Try up to 3 times to ensure activation
      let attempt = 0;
      let activationSuccess = false;
      
      while (attempt < 3 && !activationSuccess) {
        try {
          const { error } = await supabase
            .from('attendance_sessions')
            .update({ 
              is_active: true as any, 
              end_time: null 
            } as any)
            .eq('id', sessionId as any);
            
          if (error) {
            console.error(`Error activating session (attempt ${attempt + 1}):`, error);
            attempt++;
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log('Session activated successfully');
            activationSuccess = true;
            setSessionActive(true);
          }
        } catch (err) {
          console.error(`Activation error (attempt ${attempt + 1}):`, err);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Verify the activation status
      if (activationSuccess) {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('is_active')
          .eq('id', sessionId as any)
          .maybeSingle();
          
        if (error) {
          console.error('Error verifying activation:', error);
        } else if (!data?.is_active) {
          console.error('Session still not active after update');
          setSessionActive(false);
        } else {
          console.log('Verified session is active:', data.is_active);
          setSessionActive(true);
        }
      }
      
      return activationSuccess;
      
    } catch (error) {
      console.error('Error in forceActivateSession:', error);
      setError('Failed to activate session');
      return false;
    } finally {
      setGenerating(false);
    }
  }, [sessionId]);

  // Generate new QR code data with enhanced error handling and session activation
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
      
      // Use a distinct check for the session to provide better error messages
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          qr_secret, 
          is_active
        `)
        .eq('id', sessionId as any)
        .maybeSingle();
      
      if (sessionError) {
        console.error('Error fetching session secret:', sessionError);
        
        // Check if it's a connection error
        if (sessionError.message?.includes('network') || 
            sessionError.message?.includes('Failed to fetch') ||
            sessionError.message?.includes('timeout')) {
          setConnectionError(true);
          setError('Database connection error. Please check your internet connection.');
        } else {
          setError('Error fetching session data');
        }
        return;
      }
      
      if (!sessionData) {
        console.error('Session not found:', sessionId);
        setError('Session not found');
        return;
      }
      
      console.log('Session data found:', {
        id: sessionData?.id,
        isActive: sessionData?.is_active
      });
      
      setSessionActive(!!sessionData?.is_active);
      
      // If session exists but is not active, forcefully activate it again
      if (!sessionData?.is_active) {
        console.log('Session is not active, activating again...');
        const activationSuccess = await forceActivateSession();
        
        if (!activationSuccess) {
          setError('Unable to activate session. Please try resetting.');
          return;
        }
      }
      
      // Create the QR code data with expiration time and ensure timestamp is recent
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
      // Create a simple QR data format that matches what the scanner expects
      const qrData = {
        sessionId: sessionData?.id, // Use the verified session ID from the database
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
      
      if (!connectionError) {
        setError('Failed to generate QR code');
        toast.error('Error generating QR code');
      }
    } finally {
      setGenerating(false);
      setRefreshingQR(false);
    }
  }, [sessionId, timeLeft, connectionError, forceActivateSession, refreshingQR]);

  // Set up aggressive keep-alive ping for session (every 20 seconds instead of 5)
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;
    
    // Create a ping interval (every 20 seconds)
    if (sessionId) {
      console.log('Setting up session keep-alive ping');
      pingInterval = setInterval(async () => {
        try {
          console.log('Sending keep-alive ping for session:', sessionId);
          
          const { error } = await supabase
            .from('attendance_sessions')
            .update({ 
              is_active: true as any, 
              end_time: null 
            } as any)
            .eq('id', sessionId as any);
            
          if (error) {
            console.error('Error in keep-alive ping:', error);
            // If ping fails, try force activation
            await forceActivateSession();
          } else {
            // Check session is still active
            const { data } = await supabase
              .from('attendance_sessions')
              .select('is_active')
              .eq('id', sessionId as any)
              .maybeSingle();
              
            setSessionActive(!!data?.is_active);
          }
        } catch (error) {
          console.error('Exception in keep-alive ping:', error);
        }
      }, 20000); // Every 20 seconds
    }
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [sessionId, forceActivateSession]);

  // Timer for QR code refresh - FIX for continuous refreshing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    // Initial QR code generation
    generateQRData();
    
    // Set up timer to count down from 30 seconds
    interval = setInterval(() => {
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
      if (interval) clearInterval(interval);
    };
  }, []); // Only run on initial mount, not on every change to generateQRData

  // Recovery mechanism for connection errors
  useEffect(() => {
    if (connectionError) {
      const recoveryTimer = setTimeout(() => {
        console.log('Attempting to recover from connection error...');
        generateQRData();
      }, 5000); // Try to recover after 5 seconds
      
      return () => clearTimeout(recoveryTimer);
    }
  }, [connectionError, generateQRData]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            {error.includes('activate') && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => forceActivateSession()}
                disabled={generating}
              >
                Retry
              </Button>
            )}
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
