
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import AuthForm from '@/components/auth/AuthForm';
import DashboardLayout from '@/components/layout/DashboardLayout';

const Index = () => {
  const { user, loading } = useAuth();
  const [authTabValue, setAuthTabValue] = useState<'student' | 'teacher'>('student');
  const navigate = useNavigate();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'student') {
        navigate('/student-dashboard');
      } else if (user.role === 'teacher') {
        navigate('/teacher-dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
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
          <Card className="border-2 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-2">QR Attendance</h1>
                <p className="text-muted-foreground">Secure attendance tracking with QR codes</p>
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
        <TeacherDashboard />
      ) : (
        <StudentDashboard />
      )}
    </DashboardLayout>
  );
};

const TeacherDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Create New Session</h2>
            <p className="text-muted-foreground mb-4">Generate a QR code for your current class session.</p>
            <Button>Create Session</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">View Attendance Records</h2>
            <p className="text-muted-foreground mb-4">Check attendance records for your classes.</p>
            <Button>View Records</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Scan Attendance QR</h2>
            <p className="text-muted-foreground mb-4">Scan the QR code to mark your attendance.</p>
            <Button>Scan QR Code</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Your Attendance History</h2>
            <p className="text-muted-foreground mb-4">View your attendance records.</p>
            <Button>View History</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
