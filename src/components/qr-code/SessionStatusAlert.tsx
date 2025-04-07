
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SessionStatusAlertProps {
  error: string | null;
  sessionStatus: boolean | null;
  onActivate: () => Promise<void>;
  generating: boolean;
}

export const SessionStatusAlert: React.FC<SessionStatusAlertProps> = ({ 
  error, 
  sessionStatus, 
  onActivate, 
  generating 
}) => {
  if (!error && sessionStatus) return null;
  
  return (
    <>
      {error && (
        <Alert className="w-full border-red-200 bg-red-50 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {sessionStatus === false && !error && (
        <Alert className="w-full border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertDescription className="flex justify-between items-center">
            <span>Session is inactive. Activate to allow students to mark attendance.</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onActivate}
              disabled={generating}
            >
              Activate
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};
