
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkSessionExists, verifyAttendanceSession, activateAttendanceSession } from '@/utils/sessionUtils';

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
  const processingRef = useRef<boolean>(false);
  const scannedSessionIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (scanning) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [scanning]);

  // Enhanced verification function with retry mechanism and better error handling
  const verifySession = useCallback(async (sessionId: string, maxRetries = 3): Promise<{
    verified: boolean;
    data?: any;
    error?: string;
  }> => {
    let attempt = 0;
    scannedSessionIdRef.current = sessionId;
    
    while (attempt <= maxRetries) {
      try {
        console.log(`Verifying session (attempt ${attempt + 1}/${maxRetries + 1}):`, sessionId);
        
        // First check if session exists to handle early failures quickly
        const sessionExists = await checkSessionExists(sessionId);
        if (!sessionExists && attempt < maxRetries) {
          console.log(`Session not found in quick check (attempt ${attempt + 1}), trying again...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 300 * attempt)); // Backoff
          continue;
        }
        
        // Use our enhanced utility function to verify the session with force activation
        const { exists, isActive, data, error } = await verifyAttendanceSession(sessionId, true);
        
        if (!exists) {
          console.error(`Session not found (attempt ${attempt + 1}):`, error);
          
          if (attempt < maxRetries) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 300 * attempt)); // Backoff
            continue;
          }
          
          return { verified: false, error: 'Session not found. Please ask your teacher to check the QR code.' };
        }
        
        console.log(`Session verified (attempt ${attempt + 1}):`, data);
        
        // Always force activate as an extra step to ensure it's active
        if (!isActive) {
          console.log('Session found but not active, force activating...');
          const activated = await activateAttendanceSession(sessionId);
          if (!activated) {
            console.warn('Failed to activate session');
            
            // One last try with direct update
            const { error: activateError } = await supabase
              .from('attendance_sessions')
              .update({ is_active: true, end_time: null })
              .eq('id', sessionId);
              
            if (activateError) {
              console.error('Final activation attempt failed:', activateError);
            }
          }
        }
        
        return { verified: true, data };
      } catch (error: any) {
        console.error(`Exception in verifySession (attempt ${attempt + 1}):`, error);
        
        if (attempt < maxRetries) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 300 * attempt)); // Backoff
          continue;
        }
        
        return { verified: false, error: error.message || 'Unknown error verifying session' };
      }
    }
    
    return { verified: false, error: 'Failed after multiple attempts' };
  }, []);

  const activateSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!sessionId) return false;
    
    console.log('Attempting to activate session:', sessionId);
    setActivationInProgress(true);
    
    try {
      // First, verify the session exists
      const { data: sessionData, error: checkError } = await supabase
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking session:', checkError);
        return false;
      }
      
      if (!sessionData) {
        console.error('Session not found:', sessionId);
        return false;
      }
      
      console.log('Session found, active status:', sessionData.is_active);
      
      // If already active, return true
      if (sessionData.is_active) {
        return true;
      }
      
      // Try to activate the session with multiple approaches
      const activated = await activateAttendanceSession(sessionId);
      if (activated) {
        return true;
      }
      
      // Direct update as fallback
      const { data: activateData, error: activateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true, 
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
      
      if (activateError) {
        console.error('Error activating session:', activateError);
        return false;
      }
      
      return !!activateData?.is_active;
    } catch (error) {
      console.error('Exception in activateSession:', error);
      return false;
    } finally {
      setActivationInProgress(false);
    }
  }, []);

  const markAttendance = useCallback(async (sessionId: string, qrData: any) => {
    if (!user || !sessionId) {
      console.error('Cannot mark attendance: Missing user or session ID');
      return false;
    }
    
    try {
      console.log('Marking attendance for session:', sessionId, 'student:', user.id);
      
      // First check if attendance is already marked
      const { data: existingRecord, error: checkError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', user.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing record:', checkError);
        toast.error('Error checking attendance records');
        return false;
      }
      
      if (existingRecord) {
        console.log('Attendance already marked for this session');
        return true; // Already marked is a success case
      }
      
      console.log('No existing record found, creating new attendance record');
      
      const timestamp = new Date().toISOString();
      
      // Create the attendance record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: user.id,
          timestamp
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error creating attendance record:', error);
        
        if (error.code === '23505') {
          console.log('Duplicate record detected, attendance already recorded');
          return true;
        }
        
        toast.error('Failed to record attendance');
        return false;
      }
      
      console.log('Attendance record successfully created:', data);
      
      // Double-check the record was created
      const { data: verifyData, error: verifyError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', user.id)
        .maybeSingle();
      
      if (verifyError) {
        console.warn('Verification check error:', verifyError);
      } else if (!verifyData) {
        console.warn('Verification failed: Record not found after insert');
      } else {
        console.log('Attendance record verified:', verifyData);
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected error marking attendance:', error);
      return false;
    }
  }, [user]);
  
  // Retry scanning logic when there's an error
  const retryScanning = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    
    // If we have a session ID from a failed attempt, try to verify and activate it again
    if (scannedSessionIdRef.current) {
      const sessionId = scannedSessionIdRef.current;
      
      setActivationInProgress(true);
      console.log('Retrying with session ID:', sessionId);
      
      // Try to force activate the session
      supabase
        .from('attendance_sessions')
        .update({ is_active: true, end_time: null })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) {
            console.error('Error activating session on retry:', error);
          } else {
            console.log('Successfully activated session on retry');
            // Restart scanning
            if (scanning) {
              setScanning(false);
              setTimeout(() => setScanning(true), 300);
            } else {
              setScanning(true);
            }
          }
          setActivationInProgress(false);
        });
    } else {
      // Just restart scanning
      if (scanning) {
        setScanning(false);
        setTimeout(() => setScanning(true), 300);
      } else {
        setScanning(true);
      }
    }
  }, [scanning]);

  const handleScan = async (result: any) => {
    try {
      if (!result || !result.length || !result[0]?.rawValue) {
        return;
      }
      
      const data = result[0]?.rawValue || '';
      
      if (!user || processingRef.current || recentlyMarked) return;
      
      if (lastScanned === data) return;
      setLastScanned(data);
      
      setProcessing(true);
      processingRef.current = true;
      setError(null);
      setSuccessMessage(null);
      setSessionVerified(false);
      
      console.log('Scanned QR data (raw):', data);
      
      let qrData;
      try {
        qrData = JSON.parse(data);
        console.log('Parsed QR data:', qrData);
      } catch (e) {
        console.error('QR parse error:', e);
        setError('Invalid QR code format. Please scan a valid attendance QR code.');
        setProcessing(false);
        processingRef.current = false;
        return;
      }
      
      if (!qrData.sessionId || !qrData.timestamp) {
        console.error('QR missing required fields:', qrData);
        setError('Invalid QR code format. Please scan a valid attendance QR code.');
        setProcessing(false);
        processingRef.current = false;
        return;
      }
      
      const now = Date.now();
      if (qrData.expiresAt && now > qrData.expiresAt) {
        setError('QR code has expired. Please ask your teacher to generate a new QR code.');
        setProcessing(false);
        processingRef.current = false;
        return;
      }
      
      console.log('Processing session: ', qrData.sessionId);
      scannedSessionIdRef.current = qrData.sessionId;
      
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(qrData.sessionId)) {
        console.error('Invalid session ID format:', qrData.sessionId);
        setError('Invalid QR code. Session ID format is incorrect.');
        setProcessing(false);
        processingRef.current = false;
        return;
      }

      try {
        // Force activate the session first
        await activateSession(qrData.sessionId);
        
        // Use the enhanced session verification function
        const { verified, data: sessionData, error: verifyError } = await verifySession(qrData.sessionId, 3);
        
        if (!verified) {
          const errorMessage = verifyError || 'Session verification failed';
          console.error('Session verification failed:', errorMessage);
          setError('Attendance session not found or not active. Please ask your teacher to check the QR code.');
          setProcessing(false);
          processingRef.current = false;
          return;
        }
        
        console.log('Session verified successfully:', sessionData);
        setSessionVerified(true);
        
        // Force activate the session again to ensure it's active
        await activateSession(qrData.sessionId);
        
        const attendanceSuccess = await markAttendance(qrData.sessionId, qrData);
        
        if (attendanceSuccess) {
          console.log('Attendance successfully marked!');
          setRecentlyMarked(true);
          
          let classInfo = '';
          if (sessionData && sessionData.classes) {
            // Handle different possible structures of the classes data
            if (typeof sessionData.classes === 'object' && sessionData.classes !== null && 'name' in sessionData.classes) {
              classInfo = ` for ${sessionData.classes.name}`;
            }
          }
          
          setSuccessMessage(`Attendance marked successfully${classInfo}!`);
          setTimeout(() => setRecentlyMarked(false), 5000);
          toast.success(`Attendance marked successfully${classInfo}!`);
          setRetryCount(0);
          setScanning(false);
        } else {
          console.error('Failed to mark attendance');
          setError('Failed to record attendance. Please try again.');
        }
      } catch (error: any) {
        console.error('Error in session handling:', error);
        setError(`Error: ${error.message || 'Unknown error'}`);
      } finally {
        setProcessing(false);
        processingRef.current = false;
      }
    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setError(error.message || 'Failed to process QR code');
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const handleError = (error: any) => {
    console.error('QR scanner error:', error);
    setError('Failed to access camera. Please check permissions.');
    setScanning(false);
  };

  const toggleScanner = () => {
    setScanning(prev => !prev);
    setError(null);
    setSuccessMessage(null);
    setSessionVerified(false);
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
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={retryScanning}
                className="ml-2 flex items-center gap-1 whitespace-nowrap"
                disabled={activationInProgress}
              >
                {activationInProgress ? (
                  <LoadingSpinner className="h-3 w-3 mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                <span>Retry</span>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {successMessage && !error && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {sessionVerified && !error && !successMessage && (
          <Alert className="border-blue-200 bg-blue-50 text-blue-800">
            <AlertDescription className="flex items-center">
              <LoadingSpinner className="h-4 w-4 mr-2" />
              Session verified. Recording attendance...
            </AlertDescription>
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
                  <p className="text-white mt-4">Verifying session...</p>
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
              {activationInProgress ? 'Verifying Session...' : 'Processing...'}
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
