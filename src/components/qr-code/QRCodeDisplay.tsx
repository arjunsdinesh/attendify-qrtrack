
import React, { useMemo } from 'react';
import QRCode from 'react-qr-code';
import { LoadingSpinner } from '@/components/ui-components';

interface QRCodeDisplayProps {
  qrValue: string;
  generating: boolean;
  timeLeft: number;
  progressPercentage: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  qrValue, 
  generating, 
  timeLeft,
  progressPercentage
}) => {
  return (
    <div className="relative">
      <div 
        className="absolute inset-0 rounded-full" 
        style={{
          background: `conic-gradient(#3b82f6 ${progressPercentage}%, transparent 0%)`,
          padding: '0.5rem'
        }}
      />
      <div className="bg-white rounded-xl p-2 relative z-10">
        {qrValue ? (
          <QRCode 
            value={qrValue}
            size={200}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          />
        ) : (
          <div className="h-[200px] w-[200px] flex items-center justify-center bg-gray-100">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        )}
      </div>
    </div>
  );
};
