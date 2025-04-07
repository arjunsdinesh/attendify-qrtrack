
import React from 'react';
import QRCode from 'react-qr-code';
import { LoadingSpinner } from '@/components/ui-components';

interface QRCodeDisplayProps {
  qrValue: string;
  error: string | null;
  generating: boolean;
  timeLeft: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  qrValue, 
  error, 
  generating, 
  timeLeft 
}) => {
  return (
    <div className="relative p-2 bg-white rounded-lg shadow-sm border">
      {qrValue && !error ? (
        <div className="w-[200px] h-[200px] flex items-center justify-center">
          <QRCode value={qrValue} size={200} style={{ height: "100%", width: "100%" }} />
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
  );
};
