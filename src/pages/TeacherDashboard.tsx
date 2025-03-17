
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { QrCode, History, BookOpen, UserCircle } from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      console.log('Unauthorized access to teacher dashboard, redirecting to login');
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2"
          >
            <UserCircle className="h-4 w-4" />
            Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start mb-4">
                <div className="bg-brand-100 p-2 rounded-full mr-4">
                  <QrCode className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Create Attendance Session</h2>
                  <p className="text-muted-foreground mb-4">
                    Generate a QR code for your current class session that students can scan.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/create-session')}
                className="w-full bg-brand-500 hover:bg-brand-600"
              >
                Create Session
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start mb-4">
                <div className="bg-teal-100 p-2 rounded-full mr-4">
                  <History className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">View Attendance Records</h2>
                  <p className="text-muted-foreground mb-4">
                    Check attendance records for all your classes and sessions.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/attendance-records')}
                className="w-full bg-teal-500 hover:bg-teal-600"
              >
                View Records
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start mb-4">
                <div className="bg-purple-100 p-2 rounded-full mr-4">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Manage Classes</h2>
                  <p className="text-muted-foreground mb-4">
                    Create and manage your classes and student enrollments.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/manage-classes')}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                Manage Classes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
