
import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui-components';
import { useNavigate, Link } from 'react-router-dom';
import { Home, User, Bell, LogOut, QrCode, History, BookOpen, Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner className="h-12 w-12 mx-auto mb-4 border-4" />
          <p className="text-gray-500 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="bg-red-50 w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center">
            <LogOut className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-gray-800">Session Expired</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your dashboard and attendance features.</p>
          <Button asChild className="w-full py-6 bg-brand-600 hover:bg-brand-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1">
            <Link to="/" className="text-base">Go to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  const isStudent = user.role === 'student';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to={isStudent ? "/student" : "/teacher"} className="flex items-center gap-2">
              <div className="bg-brand-100 rounded-full p-1.5">
                <QrCode className="h-5 w-5 text-brand-700" />
              </div>
              <span className="font-bold text-xl text-gray-800 hidden md:inline">QR Attendance</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-brand-600">
              <Bell className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/profile')}
              className="text-gray-600 hover:text-brand-600"
            >
              <User className="h-5 w-5" />
            </Button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="text-gray-600 hover:text-red-600"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12">
        {children}
      </div>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 md:py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-around items-center">
            <Link to={isStudent ? "/student" : "/teacher"} className="flex flex-col items-center p-2 text-brand-600">
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Home</span>
            </Link>
            
            {isStudent ? (
              <>
                <Link to="/scan-qr" className="flex flex-col items-center p-2 text-gray-500 hover:text-brand-600">
                  <QrCode className="h-5 w-5" />
                  <span className="text-xs mt-1">Scan</span>
                </Link>
                <Link to="/attendance-history" className="flex flex-col items-center p-2 text-gray-500 hover:text-brand-600">
                  <History className="h-5 w-5" />
                  <span className="text-xs mt-1">History</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/create-session" className="flex flex-col items-center p-2 text-gray-500 hover:text-brand-600">
                  <QrCode className="h-5 w-5" />
                  <span className="text-xs mt-1">Create</span>
                </Link>
                <Link to="/attendance-records" className="flex flex-col items-center p-2 text-gray-500 hover:text-brand-600">
                  <History className="h-5 w-5" />
                  <span className="text-xs mt-1">Records</span>
                </Link>
                <Link to="/manage-classes" className="flex flex-col items-center p-2 text-gray-500 hover:text-brand-600">
                  <BookOpen className="h-5 w-5" />
                  <span className="text-xs mt-1">Classes</span>
                </Link>
              </>
            )}
            
            <Link to="/profile" className="flex flex-col items-center p-2 text-gray-500 hover:text-brand-600">
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
