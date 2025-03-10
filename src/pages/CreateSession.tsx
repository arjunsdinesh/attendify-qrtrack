
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { SessionControls } from '@/components/attendance/SessionControls';

const CreateSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('class');
  
  // Early return if not a teacher
  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
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
