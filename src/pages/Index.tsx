
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui-components';
import AuthForm from '@/components/auth/AuthForm';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { checkSupabaseConnection } from '@/utils/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dbConnected, setDbConnected] = useState(true);
  const [localLoading, setLocalLoading] = useState(true);
  const [emailConfirmationChecked, setEmailConfirmationChecked] = useState(false);

  // Check database connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await checkSupabaseConnection();
        setDbConnected(connected);
        if (!connected) {
          toast.error('Database connection failed. Please check your configuration.');
          console.error('Failed to connect to Supabase database.');
        } else {
          console.log('Successfully connected to Supabase database.');
          setEmailConfirmationChecked(true);
        }
      } finally {
        setLocalLoading(false);
      }
    };
    
    checkConnection();
  }, []);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'student') {
        navigate('/student');
      } else if (user.role === 'teacher') {
        navigate('/teacher');
      }
    }
  }, [user, loading, navigate]);

  const getEmailConfirmationFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email_confirmed') === 'true';
  };

  // Show a success message if email was just confirmed
  useEffect(() => {
    if (emailConfirmationChecked && getEmailConfirmationFromUrl()) {
      toast.success('Email confirmed successfully! You can now log in.');
    }
  }, [emailConfirmationChecked]);

  if (loading || localLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

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
                <h1 className="text-3xl font-bold mb-2">QR Attendance</h1>
                <p className="text-muted-foreground">Secure attendance tracking with QR codes</p>
                {!dbConnected && (
                  <p className="text-destructive mt-2">
                    Database connection error. Please check your configuration.
                  </p>
                )}
              </div>
              
              <AuthForm />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // This should not normally be reached due to the useEffect redirect
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
