
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { ClassList } from '@/components/classes/ClassList';
import { SessionActivator } from '@/components/debug/SessionActivator';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Show loading or redirect if not a student
  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p>Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Student Dashboard</h1>
        
        {/* Session Activator for debugging */}
        <SessionActivator />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Button 
            onClick={() => navigate('/scan-qr')}
            size="lg"
            className="h-28 text-lg"
          >
            Scan QR Code to Mark Attendance
          </Button>
          
          <Button 
            onClick={() => navigate('/attendance-history')}
            variant="outline"
            size="lg"
            className="h-28 text-lg"
          >
            View My Attendance History
          </Button>
        </div>
        
        <ClassList role="student" />
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
