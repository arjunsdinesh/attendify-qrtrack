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
  const [lastActivationTime, setLastActivationTime] = useState<number>(Date.now());
  const [lastQRGeneration, setLastQRGeneration] = useState<number>(Date.now());

  // Enhanced session activation with robust error handling
  const forceActivateSession = useCallback(async () => {
    try {
      // Only try to activate if it's been more than 5 seconds since last activation
      // to prevent too many requests
      const now = Date.now();
      if (now - lastActivationTime < 5000) {
        console.log('Skipping activation, too soon since last attempt');
        return sessionActive;
      }
      
      console.log('Force activating session:', sessionId);
      setGenerating(true);
      
      // Use update with RETURNING to get confirmation
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true,
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
        
      if (error) {
        console.error('Error activating session:', error);
        setSessionActive(false);
        setError('Failed to activate session');
        return false;
      }
      
      // Verify the update was successful
      if (!data || !data.is_active) {
        console.error('Session activation did not work, data returned:', data);
        setSessionActive(false);
        setError('Failed to activate session - server did not confirm activation');
        return false;
      }
      
      console.log('Session activated successfully, confirmation:', data);
      setLastActivationTime(now);
      setSessionActive(true);
      setError(null);
      return true;
      
    } catch (error) {
      console.error('Error in forceActivateSession:', error);
      setError('Failed to activate session');
      return false;
    } finally {
      setGenerating(false);
    }
  }, [sessionId, sessionActive, lastActivationTime]);

  // Generate new QR code data with enhanced session activation
  const generateQRData = useCallback(async () => {
    // Enforce minimum time between QR generations (25 seconds)
    const now = Date.now();
    if (now - lastQRGeneration < 25000 && qrValue) {
      console.log('QR refresh throttled, too soon since last generation');
      return;
    }
    
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
      
      // First, verify the session exists and activate it if needed
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('is_active')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('Error checking session:', sessionError);
        // Try to force activate anyway as a fallback
        const activated = await forceActivateSession();
        
        if (!activated) {
          setConnectionError(true);
          throw new Error('Could not verify session status');
        }
      } else if (!sessionData.is_active) {
        console.log('Session exists but is not active, activating...');
        await forceActivateSession();
      } else {
        console.log('Session already active:', sessionData);
        setSessionActive(true);
      }
      
      // Create the QR code data with expiration time
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
      // Create a QR data format that matches what the scanner expects
      const qrData = {
        sessionId,
        timestamp,
        expiresAt,
        isActive: true
      };
      
      console.log('Generated QR data:', {
        sessionId: qrData.sessionId,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt,
        isActive: qrData.isActive
      });
      
      setQrValue(JSON.stringify(qrData));
      setLastQRGeneration(now);
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code: ' + (error.message || 'Unknown error'));
      toast.error('Error generating QR code');
    } finally {
      setGenerating(false);
      setRefreshingQR(false);
    }
  }, [sessionId, timeLeft, forceActivateSession, refreshingQR, qrValue, lastQRGeneration]);

  // Set up keep-alive ping for session
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;
    
    if (sessionId) {
      console.log('Setting up session keep-alive ping');
      
      // Create a ping interval (every 10 seconds)
      pingInterval = setInterval(async () => {
        try {
          console.log('Sending keep-alive ping for session:', sessionId);
          
          const { data, error } = await supabase
            .from('attendance_sessions')
            .update({ 
              is_active: true, 
              end_time: null 
            })
            .eq('id', sessionId)
            .select('is_active')
            .single();
            
          if (error) {
            console.error('Error in keep-alive ping:', error);
            // Try to force activate on error
            await forceActivateSession();
          } else if (data && data.is_active) {
            console.log('Keep-alive ping successful, session confirmed active');
            setSessionActive(true);
            setError(null);
          } else {
            console.warn('Keep-alive ping successful but session not active');
            await forceActivateSession();
          }
        } catch (error) {
          console.error('Exception in keep-alive ping:', error);
          // Don't set error here to avoid too many error notifications
        }
      }, 10000); // Every 10 seconds
    }
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [sessionId, forceActivateSession]);

  // Initial setup and QR code refresh timer 
  useEffect(() => {
    // Initial QR code generation
    generateQRData();
    
    // Set up timer to count down from 30 seconds exactly
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        // Only refresh QR when timer hits exactly 0
        if (prev <= 1) {
          console.log('Timer hit 0, generating new QR code');
          generateQRData();
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);
    
    // Immediately activate the session when component mounts
    forceActivateSession();
    
    return () => {
      clearInterval(interval);
    };
  }, [generateQRData, forceActivateSession]);

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
          // Manual refresh - full reset of timer
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
