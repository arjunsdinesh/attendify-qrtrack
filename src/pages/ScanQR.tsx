
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

  // Handle successful QR code scan
  const handleScan = async (result: any) => {
    try {
      // Extract the data from the scanned QR code
      const data = result[0]?.rawValue || '';
      
      if (processing || success) return;
      
      // Clear previous error
      setError(null);
      setProcessing(true);
      
      // Parse the QR code data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid QR code format. Please scan a valid attendance QR code.');
      }
      
      // Check if the QR code contains all required fields
      if (!qrData.sessionId || !qrData.timestamp || !qrData.signature || !qrData.expiresAt) {
        throw new Error('Invalid QR code format. Missing required fields.');
      }
      
      // Check if the QR code is expired using the explicit expiration time
      const now = Date.now();
      
      // Use the explicit expiration time from the QR code
      if (now > qrData.expiresAt) {
        throw new Error('QR code has expired. Please ask your teacher to generate a new code.');
      }
      
      console.log('Checking session:', qrData.sessionId);
      
      // Check if the session is active with detailed error handling
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          is_active,
          classes(name),
          start_time
        `)
        .eq('id', qrData.sessionId)
        .maybeSingle();
      
      if (sessionError) {
        console.error('Session query error:', sessionError);
        throw new Error('Error verifying session. Please try again.');
      }
      
      if (!sessionData) {
        throw new Error('Session not found. Please scan a valid QR code.');
      }
      
      if (!sessionData.is_active) {
        throw new Error('This attendance session is no longer active. Please ask your teacher to start a new session.');
      }
      
      // Extract class name from session data
      let className = 'Unknown Class';
      if (sessionData.classes) {
        // Handle both array and object formats that could be returned by Supabase
        if (typeof sessionData.classes === 'object' && sessionData.classes !== null) {
          // Check if it's an object with a name property
          if ('name' in sessionData.classes) {
            className = sessionData.classes.name || 'Unknown Class';
          }
        }
      }
      
      console.log('Checking existing record for session:', qrData.sessionId, 'and student:', user.id);
      
      // Check if attendance was already marked for this session
      const { data: existingRecord, error: existingError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', qrData.sessionId)
        .eq('student_id', user.id)
        .maybeSingle();
      
      if (existingError) {
        console.error('Existing record query error:', existingError);
        throw new Error('Error checking attendance record. Please try again.');
      }
      
      const sessionDate = new Date(sessionData.start_time).toLocaleDateString();
      setSessionInfo({ className, date: sessionDate });
      
      if (existingRecord) {
        setSuccess(true);
        toast.info('You have already marked your attendance for this session');
        return;
      }
      
      console.log('Creating attendance record for session:', qrData.sessionId, 'and student:', user.id);
      
      // Create attendance record
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
        console.error('Insert error:', insertError);
        throw new Error('Failed to record attendance. Please try again.');
      }
      
      toast.success('Attendance marked successfully!');
      setSuccess(true);
      
      // Automatically stop scanning after successful scan
      setScanning(false);
      
    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setError(error.message || 'Failed to process QR code');
      toast.error(error.message || 'Failed to process QR code');
    } finally {
      setProcessing(false);
    }
  };

  // Handle QR scanner errors
  const handleError = (error: any) => {
    console.error('QR scanner error:', error);
    setError('Failed to access camera. Please check permissions.');
    toast.error('Failed to access camera. Please check permissions.');
    setScanning(false);
  };

  // Toggle scanning state
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
