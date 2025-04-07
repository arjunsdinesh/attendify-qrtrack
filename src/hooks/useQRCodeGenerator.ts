
import { useState, useCallback } from 'react';
import { useSessionActivation } from './useSessionActivation';

interface UseQRCodeGeneratorProps {
  sessionId: string;
  timeLeft: number;
}

interface UseQRCodeGeneratorReturn {
  qrValue: string;
  generating: boolean;
  refreshingQR: boolean;
  error: string | null;
  lastQRGeneration: number;
  sessionActive: boolean;
  generateQRData: () => Promise<void>;
  setError: (error: string | null) => void;
  forceActivateSession: () => Promise<boolean>;
}

export const useQRCodeGenerator = ({ sessionId, timeLeft }: UseQRCodeGeneratorProps): UseQRCodeGeneratorReturn => {
  const [qrValue, setQrValue] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [refreshingQR, setRefreshingQR] = useState<boolean>(false);
  const [lastQRGeneration, setLastQRGeneration] = useState<number>(Date.now());

  const {
    sessionActive,
    error,
    forceActivateSession,
    setError
  } = useSessionActivation({ sessionId });

  // Generate QR data
  const generateQRData = useCallback(async () => {
    if (qrValue && Date.now() - lastQRGeneration < 29500) {
      return;
    }
    
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
    } finally {
      setGenerating(false);
      setRefreshingQR(false);
    }
  }, [sessionId, timeLeft, forceActivateSession, refreshingQR, qrValue, lastQRGeneration, setError]);

  return {
    qrValue,
    generating,
    refreshingQR,
    error,
    lastQRGeneration,
    sessionActive,
    generateQRData,
    setError,
    forceActivateSession
  };
};
