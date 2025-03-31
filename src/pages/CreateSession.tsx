
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { SessionControls } from '@/components/attendance/SessionControls';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CreateSession = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('class');
  const [localLoading, setLocalLoading] = useState(false);
  
  // Improved loading behavior with shorter timeout
  useEffect(() => {
    // Start with optimistic assumption of loading completion
    const timeoutId = setTimeout(() => {
      setLocalLoading(false);
    }, 300); // Ultra-fast timeout to prevent stuck loading
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Redirect if not authenticated or not a teacher, with optimistic rendering
  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      toast.error('Only teachers can create attendance sessions');
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Show content immediately with optimistic rendering
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
        
        {/* Render SessionControls optimistically, even before auth check completes */}
        <SessionControls userId={user?.id || ''} />
      </div>
    </DashboardLayout>
  );
};

export default CreateSession;
