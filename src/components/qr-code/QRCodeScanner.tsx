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
import { checkSessionExists, verifyAttendanceSession, activateAttendanceSession, ensureSessionActive } from '@/utils/sessionUtils';

interface QRCodeScannerProps {
  onScanningStateChange?: (isScanning: boolean) => void;
  onScanAttempt?: () => void; // Callback for scan attempts
}

const QRCodeScanner = ({ onScanningStateChange, onScanAttempt }: QRCodeScannerProps) => {
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
  const displayedToastsRef = useRef<Set<string>>(new Set());
  const hasAttemptedScanRef = useRef<boolean>(false);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (onScanningStateChange) {
      onScanningStateChange(scanning);
    }
  }, [scanning, onScanningStateChange]);

  useEffect(() => {
    if (scanning) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [scanning]);

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  const verifySession = useCallback(async (sessionId: string, maxRetries = 3): Promise<{
    verified: boolean;
    data?: any;
    error?: string;
  }> => {
    let attempt = 0;
    scannedSessionIdRef.current = sessionId;
    
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      console.log('Processing timeout reached, resetting state');
      setProcessing(false);
      processingRef.current = false;
      setActivationInProgress(false);
      if (processingRef.current && !successMessage) {
        setError('Processing took too long. Please try again.');
      }
    }, 15000);
    
    while (attempt <= maxRetries) {
      try {
        console.log(`Verifying session (attempt ${attempt + 1}/${maxRetries + 1}):`, sessionId);
        
        const { count, error: countError } = await supabase
          .from('attendance_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('id', sessionId);

        let sessionExists = false;
        if (!countError && count && count > 0) {
          console.log(`Session exists (count method): ${sessionId}`);
          sessionExists = true;
        } else {
          const { data: directCheck, error: directError } = await supabase
            .from('attendance_sessions')
            .select('id')
            .eq('id', sessionId)
            .maybeSingle();
              
          if (!directError && directCheck) {
            console.log(`Session exists (direct method): ${sessionId}`);
            sessionExists = true;
          }
        }

        if (!sessionExists) {
          console.error(`Session does not exist (attempt ${attempt + 1}):`, sessionId);
          if (attempt < maxRetries) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 300 * attempt)); // Backoff
            continue;
          }
          return { verified: false, error: 'Session not found. Please ask your teacher to check the QR code.' };
        }
        
        const isActive = await ensureSessionActive(sessionId);
        
        if (!isActive) {
          console.error(`Failed to activate session (attempt ${attempt + 1})`);
          
          const { error } = await supabase
            .from('attendance_sessions')
            .update({ is_active: true, end_time: null })
            .eq('id', sessionId);
              
          if (error) {
            console.error('Direct activation failed:', error);
            attempt++;
            
            if (attempt <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 300 * attempt)); // Backoff
              continue;
            }
            
            return { 
              verified: false, 
              error: 'Failed to activate session. Please ask your teacher to check the QR code.'
            };
          } else {
            console.log('Direct update successful in fallback');
          }
        }
        
        const { exists, isActive: sessionIsActive, data, error } = await verifyAttendanceSession(sessionId, true);
        
        if (!exists) {
          console.error(`Session not found in detailed check (attempt ${attempt + 1}):`, error);
          
          const { data: directData, error: directError } = await supabase
            .from('attendance_sessions')
            .select('id, is_active, class_id, classes(name)')
            .eq('id', sessionId)
            .maybeSingle();
            
          if (!directError && directData) {
            console.log('Found session via direct check after verification failure');
            return { verified: true, data: directData };
          }
          
          if (attempt < maxRetries) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 300 * attempt)); // Backoff
            continue;
          }
          
          return { verified: false, error: 'Session not found. Please ask your teacher to check the QR code.' };
        }
        
        console.log(`Session verified (attempt ${attempt + 1}):`, data);
        
        if (!sessionIsActive) {
          console.log('Session found but not active, attempting final activation...');
          const finalActivation = await activateAttendanceSession(sessionId);
          
          if (!finalActivation) {
            console.error('Final activation attempt failed, trying direct update');
            
            const { error } = await supabase
              .from('attendance_sessions')
              .update({ is_active: true, end_time: null })
              .eq('id', sessionId);
              
            if (error) {
              console.error('Direct update also failed:', error);
              return { 
                verified: false, 
                error: 'This session is no longer active. Please ask your teacher to reactivate it.' 
              };
            } else {
              console.log('Direct update successful after activation failure');
            }
          } else {
            console.log('Final activation successful');
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
  }, [successMessage]);

  const activateSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!sessionId) return false;
    
    console.log('Attempting to activate session:', sessionId);
    setActivationInProgress(true);
    
    try {
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
      
      if (sessionData.is_active) {
        return true;
      }
      
      const activated = await activateAttendanceSession(sessionId);
      if (activated) {
        return true;
      }
      
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
      const sessionCheck = await checkSessionExists(sessionId);
      if (!sessionCheck) {
        console.error('Session does not exist:', sessionId);
        return false;
      }
      
      const isActive = await ensureSessionActive(sessionId);
      
      if (!isActive) {
        console.error('Cannot mark attendance: Session is not active, trying direct update');
        const { error: updateError } = await supabase
          .from('attendance_sessions')
          .update({ is_active: true, end_time: null })
          .eq('id', sessionId);
          
        if (updateError) {
          console.error('Direct update failed:', updateError);
          return false;
        }
      }
      
      console.log('Session confirmed active, marking attendance for session:', sessionId, 'student:', user.id);
      
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
        return true;
      }
      
      console.log('No existing record found, creating new attendance record');
      
      const timestamp = new Date().toISOString();
      
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
      return true;
    } catch (error) {
      console.error('Unexpected error marking attendance:', error);
      return false;
    }
  }, [user]);

  const retryScanning = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    
    if (scannedSessionIdRef.current) {
      const sessionId = scannedSessionIdRef.current;
      
      setActivationInProgress(true);
      console.log('Retrying with session ID:', sessionId);
      
      supabase
        .from('attendance_sessions')
        .update({ is_active: true, end_time: null })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) {
            console.error('Error activating session on retry:', error);
          } else {
            console.log('Successfully activated session on retry');
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
      
      if (onScanAttempt && !hasAttemptedScanRef.current) {
        hasAttemptedScanRef.current = true;
        onScanAttempt();
      }
      
      setProcessing(true);
      processingRef.current = true;
      setError(null);
      setSuccessMessage(null);
      setSessionVerified(false);
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        console.log('Processing timeout reached, resetting state');
        setProcessing(false);
        processingRef.current = false;
        setActivationInProgress(false);
        if (!successMessage) {
          setError('Processing took too long. Please try again.');
        }
      }, 15000);
      
      console.log('Scanned QR data (raw):', data);
      
      let qrData;
      try {
        qrData = JSON.parse(data);
        console.log('Parsed QR data:', qrData);
      } catch (e) {
        console.error('QR parse error:', e);
        setError('Invalid QR code format. Please scan a valid attendance QR code.');
        showToastOnce('error', 'Invalid QR code format. Please scan a valid attendance QR code.', 'invalid-qr');
        setProcessing(false);
        processingRef.current = false;
        return;
      }
      
      if (!qrData.sessionId || !qrData.timestamp) {
        console.error('QR missing required fields:', qrData);
        setError('Invalid QR code format. Please scan a valid attendance QR code.');
        showToastOnce('error', 'Invalid QR code format. Please scan a valid attendance QR code.', 'missing-fields');
        setProcessing(false);
        processingRef.current = false;
        return;
      }
      
      const now = Date.now();
      if (qrData.expiresAt && now > qrData.expiresAt) {
        setError('QR code has expired. Please ask your teacher to generate a new QR code.');
        showToastOnce('error', 'QR code has expired. Please ask your teacher to generate a new QR code.', 'expired-qr');
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
        showToastOnce('error', 'Invalid QR code. Session ID format is incorrect.', 'invalid-uuid');
        setProcessing(false);
        processingRef.current = false;
        return;
      }

      const { count, error: countError } = await supabase
        .from('attendance_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('id', qrData.sessionId);

      if (countError) {
        console.error('Error checking session existence with count:', countError);
      } else if (count === 0) {
        console.error('Session does not exist in initial count check:', qrData.sessionId);
        
        const { data: directCheckData, error: directCheckError } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('id', qrData.sessionId)
          .maybeSingle();
          
        if (directCheckError || !directCheckData) {
          console.error('Session not found in direct check either:', qrData.sessionId);
          setError('Attendance session not found. Please ask your teacher to check the QR code.');
          showToastOnce('error', 'Attendance session not found.', 'session-not-found-initial');
          setProcessing(false);
          processingRef.current = false;
          return;
        } else {
          console.log('Session found via direct check after count failed');
        }
      } else {
        console.log('Session exists in count check, count:', count);
      }

      setActivationInProgress(true);
      
      const directActivation = await supabase
        .from('attendance_sessions')
        .update({ is_active: true, end_time: null })
        .eq('id', qrData.sessionId);
          
      console.log('Direct activation result:', directActivation.error ? 'failed' : 'success');
      
      const { verified, data: sessionData, error: verifyError } = await verifySession(qrData.sessionId, 3);
      
      if (!verified) {
        const sessionExists = await checkSessionExists(qrData.sessionId);
        
        if (sessionExists) {
          console.log('Final existence check succeeded, proceeding with attendance');
          setSessionVerified(true);
          
          await supabase
            .from('attendance_sessions')
            .update({ is_active: true, end_time: null })
            .eq('id', qrData.sessionId);
          
          const attendanceSuccess = await markAttendance(qrData.sessionId, qrData);
          
          if (attendanceSuccess) {
            console.log('Attendance successfully marked despite verification issues!');
            setRecentlyMarked(true);
            
            let classInfo = '';
            if (sessionData && sessionData.classes) {
              if (typeof sessionData.classes === 'object' && sessionData.classes !== null && 'name' in sessionData.classes) {
                classInfo = ` for ${sessionData.classes.name}`;
              }
            }
            
            const successMsg = `Attendance marked successfully${classInfo}!`;
            setSuccessMessage(successMsg);
            setTimeout(() => setRecentlyMarked(false), 5000);
            showToastOnce('success', successMsg, 'attendance-marked');
            setRetryCount(0);
            setScanning(false);
          } else {
            const errorMessage = verifyError || 'Session verification failed';
            console.error('Could not mark attendance:', errorMessage);
            setError('Could not record attendance. Please try again or ask your teacher for help.');
            showToastOnce('error', 'Could not record attendance. Please try again.', 'mark-failed');
          }
        } else {
          const errorMessage = verifyError || 'Session verification failed';
          console.error('Session verification failed:', errorMessage);
          setError('Attendance session not found or not active. Please ask your teacher to check the QR code.');
          showToastOnce('error', 'Attendance session not found or not active. Please ask your teacher to check the QR code.', 'session-not-found');
        }
        
        setProcessing(false);
        processingRef.current = false;
        setActivationInProgress(false);
        return;
      }
      
      console.log('Session verified successfully:', sessionData);
      setSessionVerified(true);
      
      await supabase
        .from('attendance_sessions')
        .update({ is_active: true, end_time: null })
        .eq('id', qrData.sessionId);
      
      const attendanceSuccess = await markAttendance(qrData.sessionId, qrData);
      
      if (attendanceSuccess) {
        console.log('Attendance successfully marked!');
        setRecentlyMarked(true);
        
        let classInfo = '';
        if (sessionData && sessionData.classes) {
          if (typeof sessionData.classes === 'object' && sessionData.classes !== null && 'name' in sessionData.classes) {
            classInfo = ` for ${sessionData.classes.name}`;
          }
        }
        
        const successMsg = `Attendance marked successfully${classInfo}!`;
        setSuccessMessage(successMsg);
        setTimeout(() => setRecentlyMarked(false), 5000);
        showToastOnce('success', successMsg, 'attendance-marked');
        setRetryCount(0);
        setScanning(false);
      } else {
        console.error('Failed to mark attendance');
        setError('Failed to record attendance. Please try again.');
        showToastOnce('error', 'Failed to record attendance. Please try again.', 'mark-failed');
      }
    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setError(error.message || 'Failed to process QR code');
      showToastOnce('error', error.message || 'Failed to process QR code', 'qr-process-error');
      setProcessing(false);
      processingRef.current = false;
      setActivationInProgress(false);
    }
  };

  const handleError = (error: any) => {
    console.error('QR scanner error:', error);
    setError('Failed to access camera. Please check permissions.');
    showToastOnce('error', 'Failed to access camera. Please check permissions.', 'camera-error');
    setScanning(false);
  };

  const toggleScanner = () => {
    if (!scanning && onScanAttempt && !hasAttemptedScanRef.current) {
      hasAttemptedScanRef.current = true;
      onScanAttempt();
    }
    
    setScanning(prev => !prev);
    setError(null);
    setSuccessMessage(null);
    setSessionVerified(false);
    if (!scanning) {
      setRetryCount(0);
    }
  };

  const showToastOnce = useCallback((type: 'success' | 'error' | 'info', message: string, key?: string) => {
    const toastKey = key || message;
    
    if (!displayedToastsRef.current.has(toastKey)) {
      displayedToastsRef.current.add(toastKey);
      
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'info':
          toast.info(message);
          break;
      }
      
      setTimeout(() => {
        displayedToastsRef.current.delete(toastKey);
      }, 10000);
    }
  }, []);

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
