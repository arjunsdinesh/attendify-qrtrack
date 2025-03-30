import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { forceSessionActivation, activateSessionViaRPC } from '@/utils/sessionUtils';

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
  const [sessionStatusCheck, setSessionStatusCheck] = useState<boolean>(false);
  const [qrRefreshPending, setQrRefreshPending] = useState<boolean>(false);

  const forceActivateSession = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastActivationTime < 5000) {
        console.log('Skipping activation, too soon since last attempt');
        return sessionActive;
      }
      
      console.log('Force activating session:', sessionId);
      setGenerating(true);
      setSessionStatusCheck(true);
      
      const { data: checkData, error: checkError } = await supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking session existence:', checkError);
      } else if (!checkData) {
        console.error('Session does not exist:', sessionId);
        setSessionActive(false);
        setError('Session not found. Please create a new session.');
        return false;
      }
      
      const activated = await supabase.rpc('force_activate_session', { 
        session_id: sessionId 
      });
      
      if (activated.error) {
        console.error('RPC activation error:', activated.error);
        
        const { data, error } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true,
            end_time: null 
          })
          .eq('id', sessionId)
          .select('is_active')
          .single();
          
        if (error || !data || !data.is_active) {
          console.error('Standard update failed after RPC failure:', error);
          setSessionActive(false);
          setError('Failed to activate session');
          return false;
        }
        
        console.log('Standard activation succeeded after RPC failure');
        setLastActivationTime(now);
        setSessionActive(true);
        setError(null);
        return true;
      }
      
      console.log('RPC activation successful:', activated.data);
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

  const generateQRData = useCallback(async () => {
    const now = Date.now();
    
    if (qrValue && now - lastQRGeneration < 29500) {
      console.log('QR refresh prevented - not yet time for a 30-second refresh');
      setQrRefreshPending(true);
      return;
    }
    
    setQrRefreshPending(false);
    
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
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('is_active, class_id')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (sessionError) {
        console.error('Error checking session:', sessionError);
        const activated = await forceActivateSession();
        
        if (!activated) {
          setConnectionError(true);
          throw new Error('Could not verify session status');
        }
      } else if (!sessionData) {
        console.error('Session not found:', sessionId);
        setError('Session not found. Please create a new session.');
        return;
      } else if (!sessionData.is_active) {
        console.log('Session exists but is not active, activating using RPC...');
        await forceActivateSession();
      } else {
        console.log('Session already active:', sessionData);
        setSessionActive(true);
      }
      
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
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

  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;
    
    if (sessionId) {
      console.log('Setting up session keep-alive ping with RPC support');
      
      pingInterval = setInterval(async () => {
        try {
          if (sessionStatusCheck) {
            console.log('Skipping keep-alive ping, session status check in progress');
            return;
          }
          
          console.log('Sending keep-alive ping for session:', sessionId);
          
          const { error } = await supabase.rpc('force_activate_session', { 
            session_id: sessionId 
          });
          
          if (error) {
            console.error('Error in keep-alive RPC ping:', error);
            
            const { data, error: updateError } = await supabase
              .from('attendance_sessions')
              .update({ 
                is_active: true, 
                end_time: null 
              })
              .eq('id', sessionId)
              .select('is_active')
              .single();
              
            if (updateError || !data || !data.is_active) {
              console.error('Keep-alive standard update failed:', updateError);
              await forceActivateSession();
            } else {
              console.log('Keep-alive standard update successful');
              setSessionActive(true);
              setError(null);
            }
          } else {
            console.log('Keep-alive RPC ping successful');
            setSessionActive(true);
            setError(null);
          }
        } catch (error) {
          console.error('Exception in keep-alive ping:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [sessionId, forceActivateSession, sessionStatusCheck]);

  useEffect(() => {
    generateQRData();
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          console.log('Timer hit 0, generating new QR code');
          generateQRData();
          return 30;
        }
        
        if (prev === 1) {
          setQrRefreshPending(true);
        }
        
        return prev - 1;
      });
    }, 1000);
    
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
          if (!qrRefreshPending) {
            setTimeLeft(30);
            generateQRData();
          } else {
            toast.info("QR code will refresh automatically in a moment");
          }
        }} 
        className="w-full bg-green-600 hover:bg-green-700 mt-2"
        disabled={generating || refreshingQR || qrRefreshPending}
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
