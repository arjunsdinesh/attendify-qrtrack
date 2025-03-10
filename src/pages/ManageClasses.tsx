
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import ClassList from '@/components/classes/ClassList';
import CreateClassDialog from '@/components/classes/CreateClassDialog';

const ManageClasses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  // Fetch teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setClasses(data || []);
      } catch (error: any) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClasses();
  }, [user]);

  // Create new class
  const handleCreateClass = async (className: string) => {
    if (!className.trim()) {
      toast.error('Please enter a class name');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: className.trim(),
          teacher_id: user.id,
          department: 'General', // Default department
          semester: 1, // Default semester
          course_code: 'GEN101' // Default course code
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setClasses([data, ...classes]);
      setCreateDialogOpen(false);
      toast.success('Class created successfully');
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/teacher')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Manage Classes</h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create New Class</Button>
            </DialogTrigger>
            <CreateClassDialog onCreateClass={handleCreateClass} />
          </Dialog>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : (
          <ClassList 
            classes={classes}
            createDialogOpen={createDialogOpen}
            setCreateDialogOpen={setCreateDialogOpen}
            onCreateClass={handleCreateClass}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageClasses;
