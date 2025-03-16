
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkSupabaseConnection } from '@/utils/supabase';
import { toast } from 'sonner';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ConnectionStatus from './ConnectionStatus';
import { Button } from '@/components/ui/button';
import { Apple, ArrowRight, Google } from 'lucide-react';

const AuthForm = () => {
  const { initialRole } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check Supabase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkSupabaseConnection();
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
        if (!isConnected) {
          toast.error("Unable to connect to Supabase. Please check your configuration.");
        }
      } catch (error) {
        setConnectionStatus('disconnected');
        console.error('Connection check failed:', error);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <div className="max-w-md w-full mx-auto">
      <Card className="bg-white shadow-xl border-0 rounded-xl overflow-hidden">
        <ConnectionStatus status={connectionStatus} />
        
        <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'register')}>
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-bold text-center mb-2">
              {authMode === 'login' ? 'Log in' : 'Sign up'}
            </h1>
            <p className="text-muted-foreground text-center mb-6">
              {authMode === 'login' 
                ? 'Enter your credentials to access your account' 
                : 'Create a new account to get started'}
            </p>
            
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="login"
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Register
              </TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="p-6 pt-0">
            {/* Login Form */}
            <TabsContent value="login" className="mt-0">
              <LoginForm connectionStatus={connectionStatus} />
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <span className="inline-block px-4 relative before:content-[''] before:absolute before:top-1/2 before:left-full before:w-12 before:h-px before:bg-gray-200 after:content-[''] after:absolute after:top-1/2 after:right-full after:w-12 after:h-px after:bg-gray-200">
                  or
                </span>
              </div>
              
              <div className="mt-6 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-white border-gray-200 text-black font-normal"
                >
                  <Google className="h-5 w-5 mr-2" />
                  Continue with Google
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-white border-gray-200 text-black font-normal"
                >
                  <Apple className="h-5 w-5 mr-2" />
                  Continue with Apple
                </Button>
              </div>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register" className="mt-0">
              <RegisterForm connectionStatus={connectionStatus} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthForm;
