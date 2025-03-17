
import { useEffect, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import QRCodeScanner from '@/components/qr-code/QRCodeScanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/utils/supabase';

// Memoized component to prevent unnecessary re-renders
const MemoizedQRScanner = memo(QRCodeScanner);

const ScanQR = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [scannerKey, setScannerKey] = useState<number>(Date.now());
  
  // Reset scanner state
  const resetScanner = () => {
    setScannerKey(Date.now());
  };
  
  // Check for active attendance sessions when the page loads
  useEffect(() => {
    const checkForActiveSessions = async () => {
      try {
        // Test the database connection
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('count', { count: 'exact', head: true })
          .limit(1);
          
        if (error) {
          console.error('Database connection check failed:', error);
          setConnectionStatus(false);
        } else {
          console.log('Database connection successful');
          setConnectionStatus(true);
        }
      } catch (error) {
        console.error('Error checking for active sessions:', error);
        setConnectionStatus(false);
      }
    };
    
    checkForActiveSessions();
    
    // Reset scanner every 2 minutes to ensure fresh state
    const resetInterval = setInterval(resetScanner, 120000);
    
    return () => {
      clearInterval(resetInterval);
    };
  }, []);
  
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
            <AlertDescription>
              Could not connect to the database. Please check your internet connection and refresh the page.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4">
          <Button 
            onClick={resetScanner} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            Reset Scanner
          </Button>
        </div>
        
        <MemoizedQRScanner key={`scanner-${scannerKey}`} />
      </div>
    </DashboardLayout>
  );
};

export default ScanQR;
