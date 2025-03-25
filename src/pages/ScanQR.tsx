
import { useEffect, memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import QRCodeScanner from '@/components/qr-code/QRCodeScanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase, checkSupabaseConnection } from '@/utils/supabase';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

// Memoized component to prevent unnecessary re-renders
const MemoizedQRScanner = memo(QRCodeScanner);

const ScanQR = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [scannerKey, setScannerKey] = useState<number>(Date.now());
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  
  // Reset scanner state
  const resetScanner = useCallback(() => {
    setScannerKey(Date.now());
    toast.info("Scanner reset. Try scanning again.");
  }, []);
  
  // Function to check database connection with enhanced error handling
  const checkConnection = useCallback(async () => {
    try {
      setIsCheckingConnection(true);
      const isConnected = await checkSupabaseConnection(true); // Force fresh check
      setConnectionStatus(isConnected);
      
      if (!isConnected) {
        console.error('Failed to connect to database');
        toast.error('Could not connect to the database. Check your internet connection.');
      } else {
        console.log('Database connection successful');
        
        // Also check if we can access attendance sessions table specifically
        const { error: sessionCheckError } = await supabase
          .from('attendance_sessions')
          .select('count', { count: 'exact', head: true })
          .limit(1);
          
        if (sessionCheckError) {
          console.error('Cannot access attendance sessions:', sessionCheckError);
          toast.warning('Connected to database, but attendance data may be unavailable');
        } else {
          toast.success('Successfully connected to attendance system');
        }
      }
      
      return isConnected;
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus(false);
      toast.error('Connection error. Please check your internet and try again.');
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);
  
  // Check for active attendance sessions when the page loads
  useEffect(() => {
    checkConnection();
    
    // Reset scanner every 2 minutes to ensure fresh state
    const resetInterval = setInterval(resetScanner, 120000);
    
    return () => {
      clearInterval(resetInterval);
    };
  }, [resetScanner, checkConnection]);
  
  useEffect(() => {
    if (!loading && user && user.role !== 'student') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Optimized loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
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
        
        {connectionStatus === false && (
          <Alert className="mb-4 border-red-200 bg-red-50 text-red-800">
            <AlertDescription className="flex justify-between items-center">
              <span>Could not connect to the database. Please check your internet connection.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkConnection}
                disabled={isCheckingConnection}
              >
                {isCheckingConnection ? <LoadingSpinner className="h-4 w-4" /> : 'Retry'}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
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
              onClick={checkConnection}
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
