
import { useState, useCallback } from 'react';
import { useSessionManagement } from './useSessionManagement';

interface UseQRCodeGeneratorProps {
  sessionId: string;
  classId: string;
  timeLeft: number;
}

export const useQRCodeGenerator = ({ sessionId, classId, timeLeft }: UseQRCodeGeneratorProps) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const {
    sessionStatus,
    generating,
    error,
    forceActivateSession,
    checkSessionStatus,
    setError
  } = useSessionManagement({ sessionId });

  // Generate QR code with enhanced session activation
  const generateQRData = useCallback(async () => {
    // Prevent multiple simultaneous generation attempts
    if (refreshing) {
      console.log('Already refreshing QR, skipping this request');
      return;
    }
    
    try {
      setRefreshing(true);
      setError(null);
      
      console.log('Generating QR code for session:', sessionId);
      
      // Force session activation before generating QR
      const isActive = await checkSessionStatus();
      
      if (!isActive) {
        console.warn('Could not verify session active status');
        const forcedActive = await forceActivateSession();
        if (!forcedActive) {
          throw new Error('Could not activate session');
        }
      }
      
      // Create the QR code data
      const timestamp = Date.now();
      const expiresAt = timestamp + (timeLeft * 1000);
      
      const qrData = {
        sessionId,
        timestamp,
        expiresAt,
        isActive: true,
        classId
      };
      
      console.log('QR data created:', {
        sessionId: qrData.sessionId,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt
      });
      
      setQrValue(JSON.stringify(qrData));
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
    } finally {
      setRefreshing(false);
    }
  }, [sessionId, classId, timeLeft, refreshing, checkSessionStatus, forceActivateSession, setError]);

  return {
    qrValue,
    refreshing,
    generating,
    error,
    sessionStatus,
    generateQRData,
    forceActivateSession,
    checkSessionStatus
  };
};
