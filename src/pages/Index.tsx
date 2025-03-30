import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui-components';
import { checkSupabaseConnection } from '@/utils/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ConnectionStatus from '@/components/auth/ConnectionStatus';

const AuthForm = lazy(() => import('@/components/auth/AuthForm'));

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dbConnected, setDbConnected] = useState<boolean | null>(null); // null means checking
  const [localLoading, setLocalLoading] = useState(true);
  const [emailConfirmationChecked, setEmailConfirmationChecked] = useState(false);
  const [connectionCheckTimeout, setConnectionCheckTimeout] = useState(false);

  const checkConnection = async () => {
    try {
      setDbConnected(null); // Set to checking
      
      // Shorter timeout for UI responsiveness
      const timeoutId = setTimeout(() => {
        console.log('UI timeout for database connection check');
        setConnectionCheckTimeout(true);
      }, 3000); // 3 second UI timeout
      
      const connected = await checkSupabaseConnection();
      
      clearTimeout(timeoutId);
      
      setDbConnected(connected);
      if (!connected) {
        console.error('Database connection failed');
        toast.error('Database connection failed. Please check your configuration or try again later.');
      } else {
        console.log('Database connection successful');
      }
    } catch (error) {
      console.error('Error checking DB connection:', error);
      setDbConnected(false);
    } finally {
      setLocalLoading(false);
      setEmailConfirmationChecked(true);
    }
  };
  
  useEffect(() => {
    let isMounted = true;
    
    const runConnectionCheck = async () => {
      await checkConnection();
      if (!isMounted) return;
    };
    
    runConnectionCheck();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !localLoading && user) {
      const destination = user.role === 'student' ? '/student' : '/teacher';
      navigate(destination, { replace: true });
    }
  }, [user, loading, localLoading, navigate]);

  const getEmailConfirmationFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email_confirmed') === 'true';
  };

  useEffect(() => {
    if (emailConfirmationChecked && getEmailConfirmationFromUrl()) {
      toast.success('Email confirmed successfully! You can now log in.');
    }
  }, [emailConfirmationChecked]);

  useEffect(() => {
    console.log('Auth loading state:', loading);
    console.log('Local loading state:', localLoading);
    console.log('Database connection state:', dbConnected);
    console.log('Connection timeout state:', connectionCheckTimeout);
  }, [loading, localLoading, dbConnected, connectionCheckTimeout]);

  // If we're still in auth loading state but not in connection timeout, show the spinner
  if (loading && !connectionCheckTimeout && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    const connectionStatus = dbConnected === null ? 'checking' : 
                            dbConnected ? 'connected' : 'disconnected';
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          {getEmailConfirmationFromUrl() && (
            <Alert variant="success" className="mb-4 bg-green-50 border-green-200">
              <Mail className="h-4 w-4" />
              <AlertTitle>Email confirmed</AlertTitle>
              <AlertDescription>
                Your email has been confirmed successfully. You can now log in to your account.
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="border-2 shadow-lg">
            <ConnectionStatus 
              status={connectionStatus} 
              onRetry={checkConnection} 
            />
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-2">Attendify</h1>
                <p className="text-muted-foreground">Secure attendance tracking with QR codes</p>
                {connectionCheckTimeout && dbConnected === null && (
                  <p className="text-amber-600 mt-2">
                    Connection check is taking longer than expected. You can still attempt to use the app.
                  </p>
                )}
              </div>
              
              <Suspense fallback={<LoadingSpinner className="h-6 w-6 mx-auto" />}>
                <AuthForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {user.role === 'teacher' ? (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Create New Session</h2>
                <p className="text-muted-foreground mb-4">Generate a QR code for your current class session.</p>
                <button onClick={() => navigate('/create-session')} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">Create Session</button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">View Attendance Records</h2>
                <p className="text-muted-foreground mb-4">Check attendance records for your classes.</p>
                <button onClick={() => navigate('/attendance-records')} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">View Records</button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Scan Attendance QR</h2>
                <p className="text-muted-foreground mb-4">Scan the QR code to mark your attendance.</p>
                <button onClick={() => navigate('/scan-qr')} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">Scan QR Code</button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Your Attendance History</h2>
                <p className="text-muted-foreground mb-4">View your attendance records.</p>
                <button onClick={() => navigate('/attendance-history')} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">View History</button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
