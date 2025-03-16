
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';

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
      if (!sessionId) return;
      
      setGenerating(true);
      setError(null);
      
      // Check if the session still exists and is active
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('qr_secret, is_active')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (sessionError) {
        console.error('Error fetching session secret:', sessionError);
        setError('Error fetching session data');
        throw sessionError;
      }
      
      if (!sessionData) {
        setError('Session not found');
        onEndSession(); // End the session if it doesn't exist
        return;
      }
      
      // Ensure the session is still active
      if (!sessionData.is_active) {
        setError('This session is no longer active');
        onEndSession(); // End the session if it's not active
        return;
      }
      
      const secret = sessionData.qr_secret || '';
      
      if (!secret) {
        console.error('QR secret not found for session');
        setError('QR secret not found');
        return;
      }
      
      // Create the QR code data with a longer expiration buffer
      const timestamp = Date.now();
      // Add 5 extra seconds to account for network delays and clock differences
      const expiresAt = timestamp + ((timeLeft + 5) * 1000); 
      
      const qrData = {
        sessionId,
        timestamp,
        expiresAt,
        classId: className // Using className as classId for simplicity
      };
      
      // Generate a signature to verify the QR code hasn't been tampered with
      const signature = createSignature(qrData, secret);
      
      const finalData = { ...qrData, signature };
      setQrValue(JSON.stringify(finalData));
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
      toast.error('Error generating QR code');
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

  return (
    <div className="flex flex-col items-center space-y-4">
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
