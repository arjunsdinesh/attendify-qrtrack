import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { forceSessionActivation, activateSessionViaRPC, ensureSessionActive } from '@/utils/sessionUtils';

interface QRGeneratorProps {
  sessionId: string;
  className: string;
  onEndSession: () => void;
}

export const QRGenerator = ({ sessionId, className, onEndSession }: QRGeneratorProps) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [refreshingQR, setRefreshingQR] = useState<boolean>(false);
  const [lastActivationTime, setLastActivationTime] = useState<number>(Date.now());
  const [lastQRGeneration, setLastQRGeneration] = useState<number>(Date.now());
  const [sessionStatusCheck, setSessionStatusCheck] = useState<boolean>(false);
  const [timerReachedZero, setTimerReachedZero] = useState<boolean>(false);

  // Force activate the session
  const forceActivateSession = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastActivationTime < 5000) {
        return sessionActive;
      }
      
      setGenerating(true);
      setSessionStatusCheck(true);
      
      const { data: checkData, error: checkError } = await supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (checkError || !checkData) {
        setSessionActive(false);
        setError('Session not found. Please create a new session.');
        return false;
      }
      
      if (checkData.is_active) {
        setSessionActive(true);
        setError(null);
        setLastActivationTime(now);
        return true;
      }
      
      // Try multiple activation methods
      const results = await Promise.allSettled([
        supabase.rpc('force_activate_session', { session_id: sessionId }),
        supabase
          .from('attendance_sessions')
          .update({ is_active: true, end_time: null })
          .eq('id', sessionId)
          .select('is_active')
          .single(),
        forceSessionActivation(sessionId)
      ]);
      
      const success = results.some(r => r.status === 'fulfilled');
      
      if (!success) {
        setSessionActive(false);
        setError('Failed to activate session. Try creating a new session.');
        return false;
      }
      
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
      setSessionStatusCheck(false);
    }
  }, [sessionId, sessionActive, lastActivationTime]);

  // Generate QR data
  const generateQRData = useCallback(async () => {
    if (!timerReachedZero && qrValue && Date.now() - lastQRGeneration < 29500) {
      return;
    }
    
    setTimerReachedZero(false);
    
    if (refreshingQR || !sessionId) {
      return;
    }
    
    try {
      setRefreshingQR(true);
      setGenerating(true);
      setError(null);
      
      // Check and activate session if needed
      await forceActivateSession();
      
      // Generate QR data
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000);
      
      const qrData = {
        sessionId,
        timestamp,
        expiresAt,
        isActive: true
      };
      
      setQrValue(JSON.stringify(qrData));
      setLastQRGeneration(timestamp);
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code: ' + (error.message || 'Unknown error'));
      toast.error('Error generating QR code');
    } finally {
      setGenerating(false);
      setRefreshingQR(false);
    }
  }, [sessionId, timeLeft, forceActivateSession, refreshingQR, qrValue, lastQRGeneration, timerReachedZero]);

  // Setup session keep-alive ping
  useEffect(() => {
    if (!sessionId) return;
    
    const pingInterval = setInterval(async () => {
      if (sessionStatusCheck) return;
      
      try {
        await Promise.allSettled([
          supabase.rpc('force_activate_session', { session_id: sessionId }),
          supabase
            .from('attendance_sessions')
            .update({ is_active: true, end_time: null })
            .eq('id', sessionId)
        ]);
        
        setSessionActive(true);
        setError(null);
      } catch (error) {
        console.error('Error in ping methods:', error);
      }
    }, 5000);
    
    return () => clearInterval(pingInterval);
  }, [sessionId, forceActivateSession, sessionStatusCheck]);

  // Timer and initial QR generation
  useEffect(() => {
    generateQRData();
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerReachedZero(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    forceActivateSession();
    
    return () => clearInterval(interval);
  }, [generateQRData, forceActivateSession]);

  // Handle timer reaching zero
  useEffect(() => {
    if (timerReachedZero) {
      generateQRData();
    }
  }, [timerReachedZero, generateQRData]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => forceActivateSession()} disabled={generating}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {!sessionActive && !error && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>Session is inactive. Students may not be able to scan in.</span>
            <Button size="sm" variant="outline" onClick={() => forceActivateSession()} disabled={generating}>
              Activate
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="relative p-2 bg-white rounded-lg shadow-sm border">
        {qrValue && !error ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <QRCode value={qrValue} size={200} style={{ height: "100%", width: "100%" }} />
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
          setTimeLeft(30);
          setTimerReachedZero(true);
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
