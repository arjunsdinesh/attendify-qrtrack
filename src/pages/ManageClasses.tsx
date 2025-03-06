
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';

const ManageClasses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
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
  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast.error('Please enter a class name');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: newClassName.trim(),
          teacher_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setClasses([data, ...classes]);
      setNewClassName('');
      toast.success('Class created successfully');
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          <Dialog>
            <DialogTrigger asChild>
              <Button>Create New Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    placeholder="Enter class name"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateClass} 
                  className="w-full"
                  disabled={submitting || !newClassName.trim()}
                >
                  {submitting ? <LoadingSpinner className="h-4 w-4" /> : 'Create Class'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle>{classItem.name}</CardTitle>
                  <CardDescription>Created on {formatDate(classItem.created_at)}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    {classItem.description || 'No description provided'}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/create-session?class=${classItem.id}`)}
                  >
                    Take Attendance
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/attendance-records?class=${classItem.id}`)}
                  >
                    View Records
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2">No Classes Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first class to start tracking attendance.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Create New Class</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="className2">Class Name</Label>
                    <Input
                      id="className2"
                      placeholder="Enter class name"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateClass} 
                    className="w-full"
                    disabled={submitting || !newClassName.trim()}
                  >
                    {submitting ? <LoadingSpinner className="h-4 w-4" /> : 'Create Class'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManageClasses;
