
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQRCodeGenerator } from '@/hooks/useQRCodeGenerator';
import { SessionStatus } from './SessionStatus';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QRControlButtons } from './QRControlButtons';

interface QRGeneratorProps {
  sessionId: string;
  className: string;
  onEndSession: () => void;
}

export const QRGenerator = ({ sessionId, className, onEndSession }: QRGeneratorProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [timerReachedZero, setTimerReachedZero] = useState<boolean>(false);

  const {
    qrValue,
    generating,
    refreshing,
    error,
    sessionStatus,
    generateQRData,
    forceActivateSession
  } = useQRCodeGenerator({
    sessionId,
    classId: '', // Add empty string as placeholder for classId (required by type)
    timeLeft
  });

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

  const handleRefresh = () => {
    setTimeLeft(30);
    setTimerReachedZero(true);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <SessionStatus 
        error={error}
        sessionActive={sessionStatus}
        onRetry={forceActivateSession}
        generating={generating}
      />
      
      <QRCodeDisplay 
        qrValue={qrValue}
        error={error}
        generating={generating}
        timeLeft={timeLeft}
      />
      
      <p className="text-sm text-center text-muted-foreground">
        Show this QR code to your students. It will refresh automatically every 30 seconds.
      </p>
      
      <QRControlButtons 
        onRefresh={handleRefresh}
        onEndSession={onEndSession}
        generating={generating}
        refreshingQR={refreshing}
      />
    </div>
  );
};
