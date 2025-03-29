
import { useEffect, memo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import QRCodeScanner from '@/components/qr-code/QRCodeScanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, checkSupabaseConnection } from '@/utils/supabase';
import { toast } from 'sonner';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

const MemoizedQRScanner = memo(QRCodeScanner);

const ScanQR = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [scannerKey, setScannerKey] = useState<number>(Date.now());
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [hasAttemptedScan, setHasAttemptedScan] = useState<boolean>(false);
  const connectionCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkConnectionRetryCount = useRef<number>(0);
  // Add a flag to prevent duplicate connection checks while scanning
  const isScanningRef = useRef<boolean>(false);
  // Track when the last connection check was performed
  const lastConnectionCheckRef = useRef<number>(Date.now());
  // Minimum time between automatic connection checks (15 seconds)
  const CONNECTION_CHECK_THROTTLE = 15000;

  // Check if any active sessions exist - improved version with faster timeout
  const checkForActiveSessions = useCallback(async () => {
    try {
      // Create a timeout for this specific operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .abortSignal(controller.signal);
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Error checking for active sessions:', error);
          setSessionExists(false);
          return false;
        }
        
        const hasActiveSessions = data && data.length > 0;
        console.log('Active sessions check:', hasActiveSessions ? 'Found' : 'None found');
        setSessionExists(hasActiveSessions);
        return hasActiveSessions;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.error('Session check timed out');
          // Don't update state on timeout, just return
          return sessionExists || false;
        }
        
        console.error('Exception checking for active sessions:', error);
        return sessionExists || false;
      }
    } catch (error) {
      console.error('Exception in checkForActiveSessions:', error);
      return sessionExists || false;
    }
  }, [sessionExists]);

  // Enhanced connection check with throttling and timeout handling
  const checkConnection = useCallback(async (showToasts = true, force = false) => {
    try {
      // Skip if already checking or if scanning is in progress and this is an automatic check
      if (isCheckingConnection || (isScanningRef.current && !force && !showToasts)) return false;
      
      // Throttle connection checks to prevent too many requests
      const now = Date.now();
      if (!force && now - lastConnectionCheckRef.current < CONNECTION_CHECK_THROTTLE) {
        console.log('Connection check throttled - too recent');
        return connectionStatus || false;
      }
      
      setIsCheckingConnection(true);
      lastConnectionCheckRef.current = now;
      
      // Clear any existing timer
      if (connectionCheckTimerRef.current) {
        clearTimeout(connectionCheckTimerRef.current);
        connectionCheckTimerRef.current = null;
      }
      
      console.log(`Checking connection (attempt ${checkConnectionRetryCount.current + 1})...`);
      
      const isConnected = await checkSupabaseConnection();
      setConnectionStatus(isConnected);
      
      if (!isConnected) {
        console.error('Failed to connect to database');
        
        if (showToasts) {
          toast.error('Could not connect to the database. Check your internet connection.');
        }
        
        // Increase retry count and schedule a retry with exponential backoff
        // Only if we're not currently scanning
        if (!isScanningRef.current) {
          checkConnectionRetryCount.current += 1;
          const backoffTime = Math.min(2000 * Math.pow(1.5, checkConnectionRetryCount.current), 30000);
          
          console.log(`Scheduling connection retry in ${backoffTime}ms`);
          connectionCheckTimerRef.current = setTimeout(() => {
            checkConnection(false); // Don't show toasts for auto-retries
          }, backoffTime);
        }
        
        return false;
      } else {
        console.log('Database connection successful');
        checkConnectionRetryCount.current = 0; // Reset retry counter on success
        
        // Check for active sessions with direct database access - faster approach
        const { data: sessionData, error: sessionError } = await supabase
          .from('attendance_sessions')
          .select('count', { count: 'exact', head: true })
          .eq('is_active', true)
          .limit(1);
          
        const hasActiveSessions = !sessionError && (sessionData?.count || 0) > 0;
        setSessionExists(hasActiveSessions);
        
        if (showToasts) {
          if (hasActiveSessions) {
            toast.success('Connected to attendance system. Active sessions available.');
          } else if (hasAttemptedScan) {
            // Only show this toast if user has tried to scan something
            toast.info('Connected to attendance system. No active sessions detected.');
          }
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus(false);
      
      if (showToasts) {
        toast.error('Connection error. Please check your internet and try again.');
      }
      
      // Schedule retry only if not scanning
      if (!isScanningRef.current) {
        checkConnectionRetryCount.current += 1;
        const backoffTime = Math.min(2000 * Math.pow(1.5, checkConnectionRetryCount.current), 30000);
        
        connectionCheckTimerRef.current = setTimeout(() => {
          checkConnection(false); // Don't show toasts for auto-retries
        }, backoffTime);
      }
      
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, [isCheckingConnection, checkForActiveSessions, connectionStatus, hasAttemptedScan]);
  
  const resetScanner = useCallback(() => {
    setScannerKey(Date.now());
    toast.info("Scanner reset. Try scanning again.");
  }, []);
  
  // Initialize connection check and periodic scanner reset
  useEffect(() => {
    // Initial connection check
    checkConnection(true, true);
    
    // Set up periodic connection checks - less frequent
    const connectionPingInterval = setInterval(() => {
      if (!isScanningRef.current) {  // Only check when not scanning
        checkConnection(false); // Silent check
      }
    }, 45000); // Reduced frequency to check every 45 seconds
    
    // Set up periodic scanner reset to prevent camera freezes
    const resetInterval = setInterval(resetScanner, 120000); // Reset every 2 minutes
    
    return () => {
      if (connectionCheckTimerRef.current) {
        clearTimeout(connectionCheckTimerRef.current);
      }
      clearInterval(connectionPingInterval);
      clearInterval(resetInterval);
    };
  }, [resetScanner, checkConnection]);
  
  // Redirect non-students
  useEffect(() => {
    if (!loading && user && user.role !== 'student') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Loading state 
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p>Please login to continue</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Login
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
        
        {/* Connection Status Indicator */}
        <div className="mb-4">
          {connectionStatus === false && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription className="flex justify-between items-center">
                <div className="flex items-center">
                  <WifiOff className="h-4 w-4 mr-2" />
                  <span>Could not connect to the database. Please check your internet connection.</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => checkConnection(true, true)}
                  disabled={isCheckingConnection}
                >
                  {isCheckingConnection ? <LoadingSpinner className="h-4 w-4" /> : 'Retry'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Only show the "no active sessions" alert if a scan has been attempted */}
          {connectionStatus === true && sessionExists === false && hasAttemptedScan && (
            <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
              <AlertDescription className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>No active attendance sessions found. Ask your teacher to start a session.</span>
              </AlertDescription>
            </Alert>
          )}
          
          {connectionStatus === true && sessionExists === true && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription className="flex items-center">
                <Wifi className="h-4 w-4 mr-2" />
                <span>Connected to attendance system. Sessions available for scanning.</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="space-y-4 mb-4">
          <div className="flex space-x-2">
            <Button 
              onClick={resetScanner} 
              variant="outline" 
              size="sm" 
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Reset Scanner
            </Button>
            
            <Button
              onClick={() => {
                checkConnection(true, true);
                checkForActiveSessions();
              }}
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
              Check Connection
            </Button>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200 text-blue-700">
            <AlertDescription>
              If you're having trouble scanning, try these tips:
              <ul className="list-disc ml-4 mt-1 text-xs">
                <li>Make sure the QR code is clearly visible</li>
                <li>Check your internet connection</li>
                <li>Ask your teacher to refresh their QR code</li>
                <li>Use the Reset Scanner button if needed</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
        
        <MemoizedQRScanner 
          key={`scanner-${scannerKey}`} 
          onScanningStateChange={(scanning) => {
            isScanningRef.current = scanning;
            console.log('Scanning state changed:', scanning);
            
            // If starting to scan, quickly check for active sessions
            if (scanning) {
              checkForActiveSessions();
            }
          }}
          onScanAttempt={() => {
            setHasAttemptedScan(true);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default ScanQR;
