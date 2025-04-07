
import React from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';

interface QRControlButtonsProps {
  onRefresh: () => void;
  onEndSession: () => void;
  generating: boolean;
  refreshingQR: boolean;
}

export const QRControlButtons: React.FC<QRControlButtonsProps> = ({
  onRefresh,
  onEndSession,
  generating,
  refreshingQR
}) => {
  return (
    <>
      <Button 
        onClick={onRefresh} 
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
    </>
  );
};
