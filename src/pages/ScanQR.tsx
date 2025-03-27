
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
  const connectionCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkConnectionRetryCount = useRef<number>(0);
  // Track whether we've shown a notification already
  const hasShownToastRef = useRef<{
    connection: boolean;
    noSessions: boolean;
    sessionFound: boolean;
  }>({
    connection: false,
    noSessions: false,
    sessionFound: false,
  });

  // Check if any active sessions exist
  const checkForActiveSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.error('Error checking for active sessions:', error);
        setSessionExists(false);
        return false;
      }
      
      const hasActiveSessions = data && data.length > 0;
      console.log('Active sessions check:', hasActiveSessions ? 'Found' : 'None found');
      setSessionExists(hasActiveSessions);
      return hasActiveSessions;
    } catch (error) {
      console.error('Exception checking for active sessions:', error);
      setSessionExists(false);
      return false;
    }
  }, []);

  // Enhanced connection check with exponential backoff
  const checkConnection = useCallback(async (showToasts = true) => {
    try {
      if (isCheckingConnection) return false; // Prevent multiple simultaneous checks
      
      setIsCheckingConnection(true);
      
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
        
        if (showToasts && !hasShownToastRef.current.connection) {
          toast.error('Could not connect to the database. Check your internet connection.');
          hasShownToastRef.current.connection = true;
        }
        
        // Increase retry count and schedule a retry with exponential backoff
        checkConnectionRetryCount.current += 1;
        const backoffTime = Math.min(2000 * Math.pow(1.5, checkConnectionRetryCount.current), 30000);
        
        console.log(`Scheduling connection retry in ${backoffTime}ms`);
        connectionCheckTimerRef.current = setTimeout(() => {
          checkConnection(false); // Don't show toasts for auto-retries
        }, backoffTime);
        
        return false;
      } else {
        console.log('Database connection successful');
        checkConnectionRetryCount.current = 0; // Reset retry counter on success
        
        // Check for active sessions
        const hasActiveSessions = await checkForActiveSessions();
        
        // Only show toasts if explicitly requested AND we haven't shown them yet
        if (showToasts) {
          if (hasActiveSessions && !hasShownToastRef.current.sessionFound) {
            toast.success('Connected to attendance system. Active sessions available.');
            hasShownToastRef.current.sessionFound = true;
            hasShownToastRef.current.noSessions = false; // Reset this flag
          } else if (!hasActiveSessions && !hasShownToastRef.current.noSessions) {
            toast.info('Connected to attendance system. No active sessions detected.');
            hasShownToastRef.current.noSessions = true;
            hasShownToastRef.current.sessionFound = false; // Reset this flag
          }
        }
        
        // If connection is restored, reset the connection toast flag
        hasShownToastRef.current.connection = false;
        
        return true;
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus(false);
      
      if (showToasts && !hasShownToastRef.current.connection) {
        toast.error('Connection error. Please check your internet and try again.');
        hasShownToastRef.current.connection = true;
      }
      
      // Schedule retry
      checkConnectionRetryCount.current += 1;
      const backoffTime = Math.min(2000 * Math.pow(1.5, checkConnectionRetryCount.current), 30000);
      
      connectionCheckTimerRef.current = setTimeout(() => {
        checkConnection(false); // Don't show toasts for auto-retries
      }, backoffTime);
      
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, [isCheckingConnection, checkForActiveSessions]);
  
  const resetScanner = useCallback(() => {
    setScannerKey(Date.now());
    toast.info("Scanner reset. Try scanning again.");
  }, []);
  
  // Initialize connection check and periodic scanner reset
  useEffect(() => {
    // Initial check on component mount
    checkConnection(true);
    
    // Set up periodic connection checks (silent)
    const connectionPingInterval = setInterval(() => {
      checkConnection(false); // Silent check
    }, 30000); // Check every 30 seconds
    
    // Also check for active sessions periodically (silent)
    const sessionCheckInterval = setInterval(() => {
      if (connectionStatus) {
        checkForActiveSessions();
      }
    }, 45000); // Check every 45 seconds
    
    // Set up periodic scanner reset to prevent camera freezes
    const resetInterval = setInterval(resetScanner, 120000); // Reset every 2 minutes
    
    return () => {
      if (connectionCheckTimerRef.current) {
        clearTimeout(connectionCheckTimerRef.current);
      }
      clearInterval(connectionPingInterval);
      clearInterval(sessionCheckInterval);
      clearInterval(resetInterval);
    };
  }, [resetScanner, checkConnection, checkForActiveSessions, connectionStatus]);
  
  // Handle status changes - reset toast flags when appropriate
  useEffect(() => {
    // When connection status changes, allow relevant toasts again
    if (connectionStatus === true) {
      hasShownToastRef.current.connection = false;
    } else if (connectionStatus === false) {
      hasShownToastRef.current.sessionFound = false;
      hasShownToastRef.current.noSessions = false;
    }
  }, [connectionStatus]);

  // Handle session existence changes - reset toast flags when appropriate
  useEffect(() => {
    if (sessionExists === true) {
      hasShownToastRef.current.noSessions = false;
    } else if (sessionExists === false) {
      hasShownToastRef.current.sessionFound = false;
    }
  }, [sessionExists]);
  
  // Function to manually check connection with user feedback
  const manualConnectionCheck = useCallback(() => {
    // Reset toast flags to allow notifications
    hasShownToastRef.current = {
      connection: false,
      noSessions: false,
      sessionFound: false
    };
    
    checkConnection(true);
    checkForActiveSessions();
  }, [checkConnection, checkForActiveSessions]);
  
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
                  onClick={manualConnectionCheck}
                  disabled={isCheckingConnection}
                >
                  {isCheckingConnection ? <LoadingSpinner className="h-4 w-4" /> : 'Retry'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {connectionStatus === true && sessionExists === false && (
            <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
              <AlertDescription className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Connected, but no active attendance sessions found. Ask your teacher to start a session.</span>
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
              onClick={manualConnectionCheck}
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
        
        <MemoizedQRScanner key={`scanner-${scannerKey}`} />
      </div>
    </DashboardLayout>
  );
};

export default ScanQR;
