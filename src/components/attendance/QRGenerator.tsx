
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
      
      // Check if the session still exists and is active
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          qr_secret, 
          is_active,
          id
        `)
        .eq('id', sessionId)
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
        id: sessionData.id,
        isActive: sessionData.is_active
      });
      
      // Ensure the session is still active
      if (!sessionData.is_active) {
        console.log('Session is not active, attempting to reactivate...');
        
        // Try to reactivate the session
        const { error: updateError } = await supabase
          .from('attendance_sessions')
          .update({ is_active: true })
          .eq('id', sessionId);
          
        if (updateError) {
          console.error('Error reactivating session:', updateError);
          setError('Unable to reactivate this session');
          onEndSession();
          return;
        }
        
        console.log('Session reactivated successfully');
      }
      
      // Create the QR code data with expiration time
      const timestamp = Date.now();
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
      // Create a simple QR data format that matches what the scanner expects
      const qrData = {
        sessionId: sessionData.id, // Use the verified session ID from the database
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

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 w-full">
          <AlertDescription>{error}</AlertDescription>
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
        onClick={onEndSession}
        className="w-full bg-destructive hover:bg-destructive/90"
      >
        End Session
      </Button>
    </div>
  );
};
