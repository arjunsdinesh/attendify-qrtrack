
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { SessionControls } from '@/components/attendance/SessionControls';
import { useEffect } from 'react';
import { toast } from 'sonner';

const CreateSession = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('class');
  
  // Redirect if not authenticated or not a teacher
  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      toast.error('Only teachers can create attendance sessions');
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Show loading or redirect if not a teacher
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
      <div className="max-w-md mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/teacher')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <SessionControls userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default CreateSession;
