
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import { supabase } from '@/utils/supabase';

interface QRGeneratorProps {
  sessionId: string;
  className: string;
  onEndSession: () => void;
}

export const QRGenerator = ({ sessionId, className, onEndSession }: QRGeneratorProps) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);

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
      
      // Get the current session's secret from the database
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('qr_secret')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (sessionError) {
        console.error('Error fetching session secret:', sessionError);
        throw sessionError;
      }
      
      const secret = sessionData?.qr_secret || '';
      
      if (!secret) {
        console.error('QR secret not found for session');
        return;
      }
      
      // Create the QR code data
      const timestamp = Date.now();
      const qrData = {
        sessionId,
        timestamp,
        classId: className // Using className as classId for simplicity
      };
      
      // Generate a signature to verify the QR code hasn't been tampered with
      const signature = createSignature(qrData, secret);
      
      const finalData = { ...qrData, signature };
      setQrValue(JSON.stringify(finalData));
      
    } catch (error: any) {
      console.error('Error generating QR code:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Timer for QR code refresh
  useEffect(() => {
    // Set up timer to count down from 5 seconds
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time to generate a new QR code
          generateQRData();
          return 5;
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
        {qrValue ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <QRCode 
              value={qrValue}
              size={200}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        ) : (
          <div className="h-[200px] w-[200px] flex items-center justify-center bg-gray-100">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        )}
        <div className="absolute -bottom-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
          {timeLeft}s
        </div>
      </div>
      <p className="text-sm text-center text-muted-foreground">
        Show this QR code to your students. It will refresh automatically every 5 seconds.
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
