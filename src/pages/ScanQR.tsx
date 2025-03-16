
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import QRCodeScanner from '@/components/qr-code/QRCodeScanner';

interface ClassData {
  name: string;
  [key: string]: any;
}

const ScanQR = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    if (user && user.role !== 'student') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) {
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
      <div className="max-w-md mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/student')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <QRCodeScanner />
      </div>
    </DashboardLayout>
  );
};

export default ScanQR;
