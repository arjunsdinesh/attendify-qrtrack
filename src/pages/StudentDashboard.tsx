
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { QrCode, History, ArrowRight, UserCircle } from 'lucide-react';
import { AnimatedHeading, AnimatedText } from '@/components/ui-components';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <AnimatedHeading className="text-3xl md:text-4xl font-bold text-gray-800">
              Welcome, {user.full_name ? user.full_name.split(' ')[0] : 'Student'}
            </AnimatedHeading>
            <AnimatedText delay={100} className="text-gray-600 mt-1">
              What would you like to do today?
            </AnimatedText>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')} 
            className="hidden md:flex items-center gap-2 border-gray-200 hover:bg-gray-50"
          >
            <UserCircle className="h-4 w-4" />
            Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-brand-50 to-blue-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-brand-600" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-800">Scan Attendance QR</h2>
                <p className="text-gray-600 mb-6">
                  Scan the QR code displayed by your teacher to mark your attendance for the current session.
                </p>
                <Button 
                  onClick={() => navigate('/scan-qr')} 
                  className="w-full justify-between bg-brand-600 hover:bg-brand-700 py-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                >
                  <span className="text-base font-medium">Scan QR Code</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-800">Your Attendance History</h2>
                <p className="text-gray-600 mb-6">
                  View your complete attendance record across all classes and sessions to track your progress.
                </p>
                <Button 
                  onClick={() => navigate('/attendance-history')} 
                  className="w-full justify-between bg-teal-600 hover:bg-teal-700 py-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
                >
                  <span className="text-base font-medium">View History</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-12 bg-white p-6 rounded-xl border border-gray-100 shadow-md">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/scan-qr')}
              className="justify-start h-12 border-gray-200 hover:border-brand-200 hover:bg-brand-50"
            >
              <QrCode className="h-4 w-4 mr-2 text-brand-600" />
              <span>Scan QR</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/attendance-history')}
              className="justify-start h-12 border-gray-200 hover:border-teal-200 hover:bg-teal-50"
            >
              <History className="h-4 w-4 mr-2 text-teal-600" />
              <span>History</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile')}
              className="justify-start h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            >
              <UserCircle className="h-4 w-4 mr-2 text-gray-600" />
              <span>Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
