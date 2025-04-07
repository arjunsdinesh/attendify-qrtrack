
import React from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';

interface QRControlButtonsProps {
  active: boolean;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRefresh: () => void;
  generating: boolean;
  refreshing: boolean;
}

export const QRControlButtons: React.FC<QRControlButtonsProps> = ({ 
  active, 
  onStart, 
  onStop, 
  onRefresh,
  generating,
  refreshing
}) => {
  return (
    <>
      <Button 
        onClick={active ? onStop : onStart}
        className={`w-full ${active ? 'bg-destructive hover:bg-destructive/90' : 'bg-brand-500 hover:bg-brand-600'}`}
        disabled={generating || refreshing}
      >
        {generating ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
        {active ? 'Stop Tracking' : 'Start Tracking'}
      </Button>
      
      {active && (
        <Button
          onClick={onRefresh}
          variant="outline"
          className="w-full"
          disabled={generating || refreshing}
        >
          {refreshing ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
          Refresh QR Manually
        </Button>
      )}
    </>
  );
};
