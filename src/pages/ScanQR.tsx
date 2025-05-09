
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
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

const MemoizedQRScanner = memo(QRCodeScanner);

const ScanQR = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(true); // Start with optimistic loading
  const [scannerKey, setScannerKey] = useState<number>(Date.now());
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [hasAttemptedScan, setHasAttemptedScan] = useState<boolean>(false);
  const connectionCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkConnectionRetryCount = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);
  const lastConnectionCheckRef = useRef<number>(Date.now());
  const CONNECTION_CHECK_THROTTLE = 15000;
  
  // Add timeout to prevent endless loading
  const userLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Simplified check for active sessions - quicker response
  const checkForActiveSessions = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced from 4000ms
      
      try {
        const { data, error, count } = await supabase
          .from('attendance_sessions')
          .select('id', { count: 'exact' })
          .eq('is_active', true)
          .limit(1)
          .abortSignal(controller.signal);
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Error checking for active sessions:', error);
          setSessionExists(false);
          return false;
        }
        
        const hasActiveSessions = count ? count > 0 : false;
        console.log('Active sessions check:', hasActiveSessions ? 'Found' : 'None found');
        setSessionExists(hasActiveSessions);
        return hasActiveSessions;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.error('Session check timed out');
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

  // Faster connection check with shorter timeout
  const checkConnection = useCallback(async (showToasts = true, force = false) => {
    try {
      if (isCheckingConnection || (isScanningRef.current && !force && !showToasts)) return false;
      
      const now = Date.now();
      if (!force && now - lastConnectionCheckRef.current < CONNECTION_CHECK_THROTTLE) {
        console.log('Connection check throttled - too recent');
        return connectionStatus || false;
      }
      
      setIsCheckingConnection(true);
      lastConnectionCheckRef.current = now;
      
      if (connectionCheckTimerRef.current) {
        clearTimeout(connectionCheckTimerRef.current);
        connectionCheckTimerRef.current = null;
      }
      
      console.log(`Checking connection (attempt ${checkConnectionRetryCount.current + 1})...`);
      
      // Set a timeout to assume connection if check takes too long
      const assumeConnectedTimeout = setTimeout(() => {
        console.log('Connection check taking too long, assuming connected');
        setConnectionStatus(true);
        setIsCheckingConnection(false);
      }, 800);
      
      try {
        const isConnected = await checkSupabaseConnection();
        clearTimeout(assumeConnectedTimeout);
        setConnectionStatus(isConnected);
        
        if (!isConnected) {
          console.error('Failed to connect to database');
          
          if (showToasts) {
            toast.error('Could not connect to the database. Check your internet connection.');
          }
          
          if (!isScanningRef.current) {
            checkConnectionRetryCount.current += 1;
            const backoffTime = Math.min(2000 * Math.pow(1.5, checkConnectionRetryCount.current), 30000);
            
            console.log(`Scheduling connection retry in ${backoffTime}ms`);
            connectionCheckTimerRef.current = setTimeout(() => {
              checkConnection(false);
            }, backoffTime);
          }
          
          return false;
        } else {
          console.log('Database connection successful');
          checkConnectionRetryCount.current = 0;
          
          try {
            // Quick query for active sessions
            const { data: activeSessionData } = await supabase
              .from('attendance_sessions')
              .select('id')
              .eq('is_active', true)
              .limit(1);
              
            const hasActiveSessions = activeSessionData && activeSessionData.length > 0;
            setSessionExists(hasActiveSessions);
            
            if (showToasts && hasAttemptedScan) {
              if (hasActiveSessions) {
                toast.success('Connected to attendance system. Active sessions available.');
              } else {
                toast.info('Connected to attendance system. Ready to scan QR code.');
              }
            }
            
            return true;
          } catch (error) {
            console.error('Error checking for sessions:', error);
            return true;
          }
        }
      } catch (error) {
        clearTimeout(assumeConnectedTimeout);
        console.error('Error checking connection:', error);
        setConnectionStatus(false);
        
        if (showToasts) {
          toast.error('Connection error. Please check your internet and try again.');
        }
        return false;
      } finally {
        setIsCheckingConnection(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus(false);
      return false;
    }
  }, [isCheckingConnection, connectionStatus, hasAttemptedScan]);

  const resetScanner = useCallback(() => {
    setScannerKey(Date.now());
    toast.info("Scanner reset. Try scanning again.");
  }, []);

  // Initial setup with optimistic rendering
  useEffect(() => {
    // Start with optimistic assumption that we're connected
    // to prevent loading screen
    setConnectionStatus(true); 
    
    // Set a timeout to check connection after component is rendered
    setTimeout(() => {
      checkConnection(true, false);
    }, 100);
    
    const connectionPingInterval = setInterval(() => {
      if (!isScanningRef.current) {
        checkConnection(false);
      }
    }, 45000);
    
    const resetInterval = setInterval(resetScanner, 120000);
    
    return () => {
      if (connectionCheckTimerRef.current) {
        clearTimeout(connectionCheckTimerRef.current);
      }
      clearInterval(connectionPingInterval);
      clearInterval(resetInterval);
    };
  }, [resetScanner, checkConnection]);

  // Handle auth with timeout to prevent stuck loading
  useEffect(() => {
    if (userLoadTimeoutRef.current) {
      clearTimeout(userLoadTimeoutRef.current);
    }
    
    // If loading takes too long, proceed anyway
    userLoadTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.log("Auth loading timeout reached, proceeding with UI render");
      }
    }, 1500);
    
    if (!loading && user && user.role !== 'student') {
      navigate('/');
    }
    
    return () => {
      if (userLoadTimeoutRef.current) {
        clearTimeout(userLoadTimeoutRef.current);
      }
    };
  }, [user, loading, navigate]);

  // Show spinner only for a short period, then render content
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    );
  }

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
          
          {connectionStatus === true && sessionExists === false && hasAttemptedScan && (
            <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
              <AlertDescription className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Ready to scan attendance QR code. Scan when your teacher displays it.</span>
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
              Reset Scanner
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
              Ready to scan QR code. When your teacher displays the attendance QR code, point your camera at it to scan.
            </AlertDescription>
          </Alert>
        </div>
        
        <MemoizedQRScanner 
          key={`scanner-${scannerKey}`} 
          onScanningStateChange={(scanning) => {
            isScanningRef.current = scanning;
            console.log('Scanning state changed:', scanning);
            
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
