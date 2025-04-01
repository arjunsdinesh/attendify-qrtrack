
import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';

// Preload the auth form component
const AuthForm = lazy(() => import('@/components/auth/AuthForm'));

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [emailConfirmationChecked, setEmailConfirmationChecked] = useState(false);
  const [initialRender, setInitialRender] = useState(true);

  // Check for email confirmation immediately
  useEffect(() => {
    setEmailConfirmationChecked(true);
    // Mark first render complete
    setInitialRender(false);
  }, []);

  // Non-blocking redirect for authenticated users with shorter timeout
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => {
        const destination = user.role === 'student' ? '/student' : '/teacher';
        navigate(destination, { replace: true });
      }, 5); // Reduced from 10ms to 5ms
      
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  const getEmailConfirmationFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email_confirmed') === 'true';
  };

  // Skip initial loading state - render login form immediately if no user
  if (!user && !initialRender) {
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
              
              <Suspense fallback={<div className="flex justify-center py-8"><LoadingSpinner className="h-6 w-6" /></div>}>
                <AuthForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is authenticated or still in initial load, show a minimal loading UI
  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  // User dashboard based on role
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
