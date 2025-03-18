
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ProfileForm from '@/components/profile/ProfileForm';

const Profile = () => {
  const navigate = useNavigate();
  const { user, studentProfile, teacherProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  const handleSaveProfile = async (formData: any) => {
    try {
      setSaving(true);
      
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }
      
      console.log('Saving profile with data:', formData);
      
      // Base profile data - email is required
      const profileData = {
        id: user.id,
        full_name: formData.fullName,
        updated_at: new Date().toISOString()
      };
      
      // Update the base profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Error updating base profile:', profileError);
        throw profileError;
      }
      
      // Update role-specific profile
      if (user.role === 'student') {
        const { error: studentError } = await supabase
          .from('student_profiles')
          .update({
            register_number: formData.registerNumber,
            roll_number: formData.rollNumber,
            department: formData.department,
            semester: formData.semester
          })
          .eq('id', user.id);
        
        if (studentError) {
          console.error('Error updating student profile:', studentError);
          throw studentError;
        }
      } else if (user.role === 'teacher') {
        const { error: teacherError } = await supabase
          .from('teacher_profiles')
          .update({
            employee_id: formData.employeeId,
            department: formData.department,
            designation: formData.designation
          })
          .eq('id', user.id);
        
        if (teacherError) {
          console.error('Error updating teacher profile:', teacherError);
          throw teacherError;
        }
      }
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
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
          onClick={() => navigate(user?.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user && (
              <ProfileForm 
                role={user.role as 'student' | 'teacher'}
                onSave={handleSaveProfile} 
                isLoading={saving} 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
