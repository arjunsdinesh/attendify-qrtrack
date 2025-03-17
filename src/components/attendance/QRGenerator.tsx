
import { useState, useEffect } from 'react';
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

  // Generate new QR code data
  const generateQRData = async () => {
    try {
      if (!sessionId) {
        console.error('No sessionId provided to QRGenerator');
        setError('Missing session ID');
        return;
      }
      
      setGenerating(true);
      setError(null);
      setConnectionError(false);
      
      console.log('Generating QR code for session:', sessionId);
      
      // Force activate session every time we generate a new QR code
      const { error: activateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        } as any)
        .eq('id', sessionId as any);
        
      if (activateError) {
        console.error('Error activating session on QR generate:', activateError);
        // Continue anyway and check the session status
      } else {
        console.log('Session activated successfully during QR generation');
      }
      
      // Check if the session exists and ensure it's active
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
        throw sessionError;
      }
      
      if (!sessionData) {
        console.error('Session not found:', sessionId);
        setError('Session not found');
        onEndSession(); // End the session if it doesn't exist
        return;
      }
      
      console.log('Session data found:', {
        id: sessionData?.id,
        isActive: sessionData?.is_active
      });
      
      // If session exists but is not active, forcefully activate it
      if (!sessionData?.is_active) {
        console.log('Session is not active, forcefully activating it...');
        
        // Activate the session
        const { error: updateError } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true, 
            end_time: null 
          } as any)
          .eq('id', sessionId as any);
          
        if (updateError) {
          console.error('Error activating session:', updateError);
          
          // If we've already tried several times, give up
          if (retryCount >= 3) {
            setError('Unable to activate this session after multiple attempts');
            onEndSession();
            return;
          }
          
          // Increment retry count
          setRetryCount(prev => prev + 1);
          setError('Trying to reactivate session... Please wait.');
          
          // Try again after a delay
          setTimeout(generateQRData, 1000);
          return;
        }
        
        console.log('Session activated successfully');
        toast.success('Session activated successfully');
        
        // Reset retry count after successful activation
        setRetryCount(0);
      }
      
      // Create the QR code data with expiration time
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
      // Create a simple QR data format that matches what the scanner expects
      const qrData = {
        sessionId: sessionData?.id, // Use the verified session ID from the database
        timestamp,
        expiresAt
      };
      
      // Log the QR data for debugging
      console.log('Generated QR data:', {
        sessionId: qrData.sessionId,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt
      });
      
      setQrValue(JSON.stringify(qrData));
      
      // Ping the session to keep it active
      const { error: pingError } = await supabase
        .from('attendance_sessions')
        .update({ is_active: true } as any)
        .eq('id', sessionId as any);
        
      if (pingError) {
        console.error('Error pinging session:', pingError);
        // Continue anyway
      }
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      
      if (!connectionError) {
        setError('Failed to generate QR code');
        toast.error('Error generating QR code');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Function to forcefully reactivate session
  const forceReactivateSession = async () => {
    try {
      setError(null);
      setGenerating(true);
      
      console.log('Forcefully reactivating session:', sessionId);
      
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true,
          end_time: null // Clear end time if it was set
        } as any)
        .eq('id', sessionId as any);
        
      if (error) {
        console.error('Error reactivating session:', error);
        setError('Failed to reactivate session');
        toast.error('Failed to reactivate session');
        return;
      }
      
      console.log('Session reactivated successfully');
      toast.success('Session reactivated successfully');
      setRetryCount(0);
      
      // Regenerate QR code
      generateQRData();
      
    } catch (error) {
      console.error('Error in forceReactivateSession:', error);
      setError('Failed to reactivate session');
    } finally {
      setGenerating(false);
    }
  };

  // Timer for QR code refresh
  useEffect(() => {
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
    
    // Initial QR code generation
    generateQRData();
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recovery mechanism for connection errors
  useEffect(() => {
    if (connectionError) {
      const recoveryTimer = setTimeout(() => {
        console.log('Attempting to recover from connection error...');
        generateQRData();
      }, 5000); // Try to recover after 5 seconds
      
      return () => clearTimeout(recoveryTimer);
    }
  }, [connectionError]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up an interval to ping the session to keep it alive
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      if (!sessionId) return;
      
      try {
        console.log('Sending keep-alive ping for session:', sessionId);
        
        const { error } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true, 
            end_time: null 
          } as any)
          .eq('id', sessionId as any);
          
        if (error) {
          console.error('Error in keep-alive ping:', error);
        }
      } catch (error) {
        console.error('Exception in keep-alive ping:', error);
      }
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(keepAliveInterval);
  }, [sessionId]);

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
                onClick={forceReactivateSession}
                disabled={generating}
              >
                Retry
              </Button>
            )}
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
        onClick={forceReactivateSession} 
        className="w-full bg-green-600 hover:bg-green-700 mt-2"
        disabled={generating}
      >
        {generating ? <LoadingSpinner className="h-4 w-4" /> : 'Reactivate Session'}
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
