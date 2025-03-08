
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import ProfileForm from '@/components/profile/ProfileForm';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  
  if (!user) {
    navigate('/');
    return null;
  }

  const handleSaveProfile = async (formData: any) => {
    try {
      setSaving(true);
      
      // Base profile data
      const profileData = {
        id: user.id,
        full_name: formData.fullName,
        role: user.role,
        updated_at: new Date().toISOString()
      };
      
      // Update the base profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);
      
      if (profileError) throw profileError;
      
      // Update role-specific profile
      if (user.role === 'student') {
        const { error: studentError } = await supabase
          .from('student_profiles')
          .upsert({
            id: user.id,
            register_number: formData.registerNumber,
            roll_number: formData.rollNumber,
            department: formData.department,
            semester: formData.semester
          });
        
        if (studentError) throw studentError;
      } else if (user.role === 'teacher') {
        const { error: teacherError } = await supabase
          .from('teacher_profiles')
          .upsert({
            id: user.id,
            employee_id: formData.employeeId,
            department: formData.department,
            designation: formData.designation
          });
        
        if (teacherError) throw teacherError;
      }
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate(user.role === 'teacher' ? '/teacher' : '/student')} 
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
            <ProfileForm 
              role={user.role as 'student' | 'teacher'}
              onSave={handleSaveProfile} 
              isLoading={saving} 
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
