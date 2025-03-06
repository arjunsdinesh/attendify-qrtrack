
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import ProfileForm from '@/components/profile/ProfileForm';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  
  if (!user) {
    navigate('/');
    return null;
  }

  const handleSaveProfile = async (formData: any) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.fullName,
          register_number: formData.registerNumber,
          roll_number: formData.rollNumber,
          department: formData.department,
          role: user.role,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
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
              onSubmit={handleSaveProfile} 
              isLoading={saving} 
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
