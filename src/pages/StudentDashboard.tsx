
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import ClassList from '@/components/classes/ClassList';
import { SessionActivator } from '@/components/debug/SessionActivator';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  
  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      setClassesLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } else {
        setClasses(data || []);
      }
    } catch (error) {
      console.error('Exception fetching classes:', error);
      toast.error('An error occurred while loading classes');
    } finally {
      setClassesLoading(false);
    }
  };

  const handleCreateClass = async (className: string) => {
    // Students typically don't create classes, but we need this function
    // to satisfy the props interface
    toast.info('Students cannot create classes');
    return Promise.resolve();
  };

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
        
        <ClassList 
          classes={classes} 
          createDialogOpen={createDialogOpen}
          setCreateDialogOpen={setCreateDialogOpen}
          onCreateClass={handleCreateClass}
        />
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
