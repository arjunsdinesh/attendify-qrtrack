
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSearchParams } from 'react-router-dom';
import { QRGenerator } from './QRGenerator';
import { SessionForm } from './SessionForm';
import { useAttendanceSession } from '@/hooks/useAttendanceSession';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';

interface SessionControlsProps {
  userId: string;
}

export const SessionControls = ({ userId }: SessionControlsProps) => {
  const [searchParams] = useSearchParams();
  const preselectedClassId = searchParams.get('class');
  
  // Custom hooks for cleaner component
  const { classes, isLoadingClasses } = useTeacherClasses(userId, preselectedClassId);
  const { 
    sessionId,
    active, 
    isLoading, 
    className,
    startQRGenerator, 
    stopQRGenerator 
  } = useAttendanceSession({ userId });
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Attendance Session</CardTitle>
        <CardDescription>
          {active 
            ? `QR code for ${className}. Refreshes automatically.`
            : 'Generate a QR code for students to scan and mark attendance.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {!active ? (
          <SessionForm 
            classes={classes}
            isLoadingClasses={isLoadingClasses}
            onStartSession={startQRGenerator}
            isLoading={isLoading}
            selectedClassId={preselectedClassId || ''}
          />
        ) : (
          <QRGenerator 
            sessionId={sessionId!} 
            className={className} 
            onEndSession={stopQRGenerator} 
          />
        )}
      </CardContent>
    </Card>
  );
};
