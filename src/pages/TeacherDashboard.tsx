
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <Button variant="outline" onClick={() => navigate('/profile')}>
            Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Create Attendance Session</h2>
              <p className="text-muted-foreground mb-4">
                Generate a QR code for your current class session that students can scan.
              </p>
              <Button onClick={() => navigate('/create-session')}>Create Session</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">View Attendance Records</h2>
              <p className="text-muted-foreground mb-4">
                Check attendance records for all your classes and sessions.
              </p>
              <Button onClick={() => navigate('/attendance-records')}>View Records</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Manage Classes</h2>
              <p className="text-muted-foreground mb-4">
                Create and manage your classes and student enrollments.
              </p>
              <Button onClick={() => navigate('/manage-classes')}>Manage Classes</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
