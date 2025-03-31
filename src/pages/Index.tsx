
import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui-components';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';

// Use dynamic import with error handling
const AuthForm = lazy(() => 
  import('@/components/auth/AuthForm')
    .catch(err => {
      console.error('Failed to load AuthForm:', err);
      return { 
        default: () => <div>Login form failed to load. Please refresh the page.</div> 
      };
    })
);

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [emailConfirmationChecked, setEmailConfirmationChecked] = useState(false);
  
  // Added a timeout to force UI update after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setEmailConfirmationChecked(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Check for email confirmation in URL
  useEffect(() => {
    const hasEmailConfirmation = getEmailConfirmationFromUrl();
    
    if (hasEmailConfirmation) {
      toast.success('Email confirmed successfully! You can now log in.');
    }
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      const destination = user.role === 'student' ? '/student' : '/teacher';
      navigate(destination, { replace: true });
    }
  }, [user, authLoading, navigate]);

  const getEmailConfirmationFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email_confirmed') === 'true';
  };

  // Always render immediately to prevent blank screens
  // Only show loading spinner if explicitly loading auth AND we have no user yet
  const isActuallyLoading = authLoading && !user;

  if (!user) {
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
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-2">Attendify</h1>
                <p className="text-muted-foreground">Secure attendance tracking with QR codes</p>
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

  // If we have a user, render the appropriate dashboard
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
                <Button asChild className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                  <Link to="/create-session">Create Session</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">View Attendance Records</h2>
                <p className="text-muted-foreground mb-4">Check attendance records for your classes.</p>
                <Button asChild className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                  <Link to="/attendance-records">View Records</Link>
                </Button>
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
                <Button asChild className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                  <Link to="/scan-qr">Scan QR Code</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Your Attendance History</h2>
                <p className="text-muted-foreground mb-4">View your attendance records.</p>
                <Button asChild className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                  <Link to="/attendance-history">View History</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index;
