
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <Button variant="outline" onClick={() => navigate('/profile')}>
            Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Scan Attendance QR</h2>
              <p className="text-muted-foreground mb-4">
                Scan the QR code displayed by your teacher to mark your attendance for the current session.
              </p>
              <Button onClick={() => navigate('/scan-qr')}>Scan QR Code</Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Your Attendance History</h2>
              <p className="text-muted-foreground mb-4">
                View your complete attendance record across all classes and sessions.
              </p>
              <Button onClick={() => navigate('/attendance-history')}>View History</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
