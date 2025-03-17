
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
      const isConnected = await checkSupabaseConnection();
      setConnectionStatus(isConnected);
      
      if (!isConnected) {
        console.error('Failed to connect to database');
        toast.error('Could not connect to the database. Check your internet connection.');
      } else {
        console.log('Database connection successful');
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
          <Button 
            onClick={resetScanner} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            Reset Scanner
          </Button>
          
          <Button
            onClick={checkConnection}
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={isCheckingConnection}
          >
            {isCheckingConnection ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
            Check Connection
          </Button>
        </div>
        
        <MemoizedQRScanner key={`scanner-${scannerKey}`} />
      </div>
    </DashboardLayout>
  );
};

export default ScanQR;
