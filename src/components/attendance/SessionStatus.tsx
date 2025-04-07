
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SessionStatusProps {
  error: string | null;
  sessionActive: boolean;
  onRetry: () => void;
  generating: boolean;
}

export const SessionStatus: React.FC<SessionStatusProps> = ({ 
  error, 
  sessionActive, 
  onRetry, 
  generating 
}) => {
  if (!error && sessionActive) return null;
  
  return (
    <>
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={onRetry} disabled={generating}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {!sessionActive && !error && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 w-full">
          <AlertDescription className="flex justify-between items-center">
            <span>Session is inactive. Students may not be able to scan in.</span>
            <Button size="sm" variant="outline" onClick={onRetry} disabled={generating}>
              Activate
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};
