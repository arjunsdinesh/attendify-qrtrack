
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import AuthForm from '@/components/auth/AuthForm';
import DashboardLayout from '@/components/layout/DashboardLayout';

const Index = () => {
  const { user, isLoading } = useAuth();
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
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
              
              <Tabs defaultValue="student" onValueChange={(value) => setUserRole(value as 'student' | 'teacher')}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="student">Student</TabsTrigger>
                  <TabsTrigger value="teacher">Teacher</TabsTrigger>
                </TabsList>
                <TabsContent value="student">
                  <AuthForm role="student" />
                </TabsContent>
                <TabsContent value="teacher">
                  <AuthForm role="teacher" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User is authenticated, redirect to their respective dashboard
  return (
    <DashboardLayout>
      {user.user_metadata.role === 'teacher' ? (
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
