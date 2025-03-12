import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface SessionData {
  is_active: boolean;
  classes: { name: string } | { name: string }[] | null;
  start_time: string;
}

const ScanQR = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ className: string; date: string } | null>(null);

  if (!user || user.role !== 'student') {
    navigate('/');
    return null;
  }

  const handleScan = async (result: any) => {
    try {
      const data = result[0]?.rawValue || '';
      if (processing || success) return;
      setError(null);
      setProcessing(true);

      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid QR code format. Please scan a valid attendance QR code.');
      }

      if (!qrData.sessionId || !qrData.timestamp || !qrData.signature || !qrData.expiresAt) {
        throw new Error('Invalid QR code format. Missing required fields.');
      }

      const now = Date.now();
      if (now > qrData.expiresAt) {
        throw new Error('QR code has expired. Please ask your teacher to generate a new code.');
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select<SessionData>('is_active, classes(name), start_time')
        .eq('id', qrData.sessionId)
        .maybeSingle();

      if (sessionError) {
        throw new Error('Error verifying session. Please try again.');
      }

      if (!sessionData || !sessionData.is_active) {
        throw new Error('This attendance session is no longer active.');
      }

      let className = 'Unknown Class';
      if (sessionData.classes) {
        if (Array.isArray(sessionData.classes)) {
          className = sessionData.classes[0]?.name || 'Unknown Class';
        } else {
          className = sessionData.classes.name || 'Unknown Class';
        }
      }

      const sessionDate = new Date(sessionData.start_time).toLocaleDateString();
      setSessionInfo({ className, date: sessionDate });

      const { data: existingRecord, error: existingError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', qrData.sessionId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (existingError) {
        throw new Error('Error checking attendance record. Please try again.');
      }

      if (existingRecord) {
        setSuccess(true);
        toast.info('You have already marked your attendance for this session');
        return;
      }

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert([
          {
            session_id: qrData.sessionId,
            student_id: user.id,
            timestamp: new Date().toISOString()
          }
        ]);

      if (insertError) {
        throw new Error('Failed to record attendance. Please try again.');
      }

      toast.success('Attendance marked successfully!');
      setSuccess(true);
      setScanning(false);
    } catch (error: any) {
      setError(error.message || 'Failed to process QR code');
      toast.error(error.message || 'Failed to process QR code');
    } finally {
      setProcessing(false);
    }
  };

  const handleError = (error: any) => {
    setError('Failed to access camera. Please check permissions.');
    toast.error('Failed to access camera. Please check permissions.');
    setScanning(false);
  };

  const toggleScanner = () => {
    setScanning(prev => !prev);
    if (success) setSuccess(false);
    if (error) setError(null);
    setSessionInfo(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/student')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Scan Attendance QR Code</CardTitle>
            <CardDescription>
              {scanning 
                ? 'Scan the QR code shown by your teacher'
                : 'Start scanning to mark your attendance'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {success && sessionInfo && (
              <Alert variant="success" className="mb-4 w-full">
                <AlertTitle>Attendance Marked!</AlertTitle>
                <AlertDescription>
                  Your attendance for <strong>{sessionInfo.className}</strong> on <strong>{sessionInfo.date}</strong> has been successfully recorded.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-4 w-full">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {scanning ? (
              <div className="w-full aspect-square rounded-lg overflow-hidden relative">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  scanDelay={500}
                  constraints={{ facingMode: 'environment' }}
                />
                {processing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <LoadingSpinner className="h-8 w-8" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 w-full aspect-square bg-gray-100 rounded-lg">
                <div className="text-4xl text-muted-foreground mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 8v.5M15 12v.5M15 16v.5M9 8h1M9 12h1M9 16h1M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Z" />
                  </svg>
                </div>
                <p className="text-center text-muted-foreground px-8">
                  {success 
                    ? 'Attendance successfully marked!'
                    : 'Click the button below to activate the camera and scan your attendance QR code.'}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={toggleScanner}
              className={`w-full ${scanning ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
              disabled={processing}
            >
              {processing ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                scanning ? 'Cancel Scanning' : (success ? 'Scan Another Code' : 'Start Scanning')
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ScanQR;

