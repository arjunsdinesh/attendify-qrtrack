
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const QRCodeScanner = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [recentlyMarked, setRecentlyMarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [activationInProgress, setActivationInProgress] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);

  // Reset error when starting or stopping scanning
  useEffect(() => {
    if (scanning) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [scanning]);

  // Function to aggressively attempt to activate a session by its ID with backoff retry
  const activateSession = useCallback(async (sessionId: string, maxRetries = 5) => {
    if (!sessionId) return false;
    
    let currentRetry = 0;
    setActivationInProgress(true);
    setSessionVerified(false);
    
    console.log(`Starting session activation for ${sessionId} with ${maxRetries} max retries`);
    
    while (currentRetry < maxRetries) {
      try {
        console.log(`Activating session ${sessionId} (Attempt ${currentRetry + 1}/${maxRetries})`);
        
        // Force activate the session with exponential backoff
        const { error: activateError } = await supabase
          .from('attendance_sessions')
          .update({ 
            is_active: true, 
            end_time: null 
          })
          .eq('id', sessionId);
          
        if (!activateError) {
          console.log(`Successfully updated session ${sessionId}`);
          
          // Verify the session is now active with multiple attempts
          let verificationAttempt = 0;
          const maxVerificationAttempts = 3;
          
          while (verificationAttempt < maxVerificationAttempts) {
            console.log(`Verification attempt ${verificationAttempt + 1}/${maxVerificationAttempts}`);
            
            const { data, error: verifyError } = await supabase
              .from('attendance_sessions')
              .select('is_active, class_id')
              .eq('id', sessionId)
              .maybeSingle();
              
            if (!verifyError && data?.is_active) {
              console.log(`Verified session ${sessionId} is active with class_id: ${data.class_id}`);
              setActivationInProgress(false);
              setSessionVerified(true);
              return true;
            }
            
            console.log(`Verification attempt ${verificationAttempt + 1} failed, retrying...`);
            verificationAttempt++;
            await new Promise(resolve => setTimeout(resolve, 300 * (verificationAttempt + 1)));
          }
        }
        
        // If we're here, either the update failed or verification failed
        console.error(`Failed to activate session ${sessionId} (Attempt ${currentRetry + 1})`);
          
        // Exponential backoff between retries (300ms, 600ms, 1200ms...)
        const delay = Math.min(300 * Math.pow(2, currentRetry), 2000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        currentRetry++;
      } catch (error) {
        console.error(`Error in activation attempt ${currentRetry + 1}:`, error);
        const delay = Math.min(300 * Math.pow(2, currentRetry), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        currentRetry++;
      }
    }
    
    setActivationInProgress(false);
    setSessionVerified(false);
    console.error(`Failed to activate session after ${maxRetries} attempts`);
    return false;
  }, []);

  // Handle successful QR code scan with improved session activation
  const handleScan = async (result: any) => {
    try {
      if (!result || !result.length || !result[0]?.rawValue) {
        return; // No valid scan result
      }
      
      // Extract the data from the scanned QR code
      const data = result[0]?.rawValue || '';
      
      if (!user || processing || recentlyMarked) return;
      
      // Prevent multiple quick scans
      if (lastScanned === data) return;
      setLastScanned(data);
      
      setProcessing(true);
      setError(null);
      setSuccessMessage(null);
      setSessionVerified(false);
      
      console.log('Scanned QR data (raw):', data);
      
      // Parse the QR code data
      let qrData;
      try {
        qrData = JSON.parse(data);
        console.log('Parsed QR data:', qrData);
      } catch (e) {
        console.error('QR parse error:', e);
        setError('Invalid QR code format. Please scan a valid attendance QR code.');
        setProcessing(false);
        return;
      }
      
      // Check if the QR code contains the required fields
      if (!qrData.sessionId || !qrData.timestamp) {
        console.error('QR missing required fields:', qrData);
        setError('Invalid QR code format. Please scan a valid attendance QR code.');
        setProcessing(false);
        return;
      }
      
      // Check if the QR code has expired
      const now = Date.now();
      if (qrData.expiresAt && now > qrData.expiresAt) {
        setError('QR code has expired. Please scan a fresh code.');
        setProcessing(false);
        return;
      }
      
      console.log('Processing session: ', qrData.sessionId);
      
      // Verify that the sessionId is a valid UUID
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(qrData.sessionId)) {
        console.error('Invalid session ID format:', qrData.sessionId);
        setError('Invalid QR code. Session ID format is incorrect.');
        setProcessing(false);
        return;
      }

      // First check if the session exists and get its details
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('attendance_sessions')
          .select('is_active, id, class_id')
          .eq('id', qrData.sessionId)
          .maybeSingle();
          
        if (sessionError) {
          console.error('Initial session check error:', sessionError);
          // Continue with activation attempts instead of failing immediately
        } else if (sessionData) {
          console.log('Session exists, current status:', sessionData.is_active ? 'active' : 'inactive');
          // If session exists but is inactive, we'll still try to activate it below
        } else {
          console.log('Session not found initially, will try activation');
        }
      } catch (err) {
        console.error('Error in initial session check:', err);
        // Continue with activation attempts
      }

      // Aggressively try to activate the session with multiple attempts
      console.log('Proactively activating session before checking attendance');
      setActivationInProgress(true);
      
      // Use more retries (10 instead of 5) to ensure successful activation
      const activationAttemptResult = await activateSession(qrData.sessionId, 10);
      
      if (!activationAttemptResult) {
        console.error('All session activation attempts failed');
        setError('Could not activate attendance session. Please ask your teacher to check the QR code generator.');
        setProcessing(false);
        setActivationInProgress(false);
        return;
      }
      
      console.log('Session successfully activated, verified active status');
      setSessionVerified(true);
      
      // Now that the session is confirmed active, check for existing attendance record
      try {
        console.log('Checking for existing attendance record');
        
        const { data: existingRecord, error: existingError } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('session_id', qrData.sessionId)
          .eq('student_id', user.id)
          .maybeSingle();
        
        if (existingError) {
          console.error('Error checking existing record:', existingError);
          setError('Error verifying attendance record. Please try again.');
          setProcessing(false);
          setActivationInProgress(false);
          return;
        }
        
        if (existingRecord) {
          console.log('Attendance already marked for this session');
          setRecentlyMarked(true);
          setSuccessMessage('You have already marked your attendance for this session');
          setTimeout(() => setRecentlyMarked(false), 5000);
          toast.info('You have already marked your attendance for this session');
          setProcessing(false);
          setActivationInProgress(false);
          return;
        }
        
        console.log('No existing record found, recording new attendance');
        
        // Insert new attendance record
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            session_id: qrData.sessionId,
            student_id: user.id,
            timestamp: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          setError('Failed to record attendance. Please try again.');
          setProcessing(false);
          setActivationInProgress(false);
          return;
        }
        
        // Verify the record was inserted
        const { data: verifyRecord, error: verifyError } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('session_id', qrData.sessionId)
          .eq('student_id', user.id)
          .maybeSingle();
          
        if (verifyError || !verifyRecord) {
          console.error('Failed to verify attendance record was created:', verifyError);
          setError('Failed to confirm attendance was recorded. Please try again.');
          setProcessing(false);
          setActivationInProgress(false);
          return;
        }
        
        console.log('Attendance record successfully verified:', verifyRecord.id);
        console.log('Attendance recorded successfully');
        
        // Mark as recently marked to prevent multiple submissions
        setRecentlyMarked(true);
        setSuccessMessage('Attendance marked successfully!');
        setTimeout(() => setRecentlyMarked(false), 5000);
        
        toast.success('Attendance marked successfully!');
        
        // Reset retry count on success
        setRetryCount(0);
        
        // Automatically stop scanning after successful scan
        setScanning(false);
      } catch (innerError: any) {
        console.error('Error processing attendance record:', innerError);
        setError(`Error recording attendance: ${innerError.message || 'Unknown error'}`);
      } finally {
        setProcessing(false);
        setActivationInProgress(false);
      }
    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setError(error.message || 'Failed to process QR code');
      setProcessing(false);
      setActivationInProgress(false);
    }
  };

  // Handle QR scanner errors
  const handleError = (error: any) => {
    console.error('QR scanner error:', error);
    setError('Failed to access camera. Please check permissions.');
    setScanning(false);
  };

  // Toggle scanning state
  const toggleScanner = () => {
    setScanning(prev => !prev);
    setError(null);
    setSuccessMessage(null);
    setSessionVerified(false);
    // Reset retry count when starting a new scan
    if (!scanning) {
      setRetryCount(0);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg border border-gray-100">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-sky-50">
        <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
          <QrCode className="h-5 w-5 text-brand-600" />
          Mark Attendance
        </CardTitle>
        <CardDescription className="text-gray-600">
          {scanning 
            ? 'Scan the QR code shown by your teacher'
            : 'Start scanning to mark your attendance'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-5 p-6">
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              {(error.includes('not found') || error.includes('inactive') || error.includes('activate')) && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setError(null);
                    setRetryCount(0);
                    if (scanning) toggleScanner(); // Turn off scanner
                    setTimeout(() => toggleScanner(), 500); // Turn on scanner
                  }}
                  className="ml-2 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {successMessage && !error && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        
        {sessionVerified && !error && !successMessage && (
          <Alert className="border-blue-200 bg-blue-50 text-blue-800">
            <AlertDescription>Session verified active. Recording attendance...</AlertDescription>
          </Alert>
        )}
        
        {scanning ? (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-inner border border-gray-200">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              scanDelay={500}
              constraints={{ facingMode: 'environment' }}
            />
            {(processing || activationInProgress) && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
                <LoadingSpinner className="h-10 w-10 border-4" />
                {activationInProgress ? (
                  <p className="text-white mt-4">Activating session...</p>
                ) : (
                  <p className="text-white mt-4">Processing...</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 w-full aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-4xl text-brand-500 mb-4">
              <QrCode size={64} strokeWidth={1.5} />
            </div>
            <p className="text-center text-gray-600 px-8 max-w-xs">
              Click the button below to activate the camera and scan your attendance QR code.
            </p>
          </div>
        )}
        
        <Button 
          onClick={toggleScanner}
          className={`w-full py-6 text-base font-medium ${scanning ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'} rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1`}
          disabled={processing || recentlyMarked || activationInProgress}
        >
          {processing || activationInProgress ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner className="h-5 w-5" />
              {activationInProgress ? 'Activating Session...' : 'Processing...'}
            </span>
          ) : recentlyMarked ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Attendance Marked
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {scanning ? (
                <>
                  <X className="h-5 w-5" />
                  Cancel Scanning
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  Start Scanning
                </>
              )}
            </span>
          )}
        </Button>
        
        {recentlyMarked && (
          <div className="bg-teal-50 text-teal-700 rounded-lg p-4 border border-teal-200 w-full text-center animate-fade-in">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-2" />
            <p className="text-sm font-medium">
              Your attendance has been successfully recorded.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;
