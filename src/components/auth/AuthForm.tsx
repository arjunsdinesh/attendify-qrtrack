
import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkSupabaseConnection } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ConnectionStatus from './ConnectionStatus';

// Lazy load the forms for better performance
const LoginForm = lazy(() => import('./LoginForm'));
const RegisterForm = lazy(() => import('./RegisterForm'));

const AuthForm = () => {
  const { initialRole } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  // Check Supabase connection on component mount - with optimized timing
  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      try {
        // First assume connected to avoid UI delays
        setTimeout(() => {
          if (isMounted && connectionStatus === 'checking') {
            setConnectionStatus('connected');
          }
        }, 300); // Even faster initial UI response
        
        const isConnected = await checkSupabaseConnection();
        
        // Only update if component is still mounted
        if (isMounted) {
          setConnectionStatus(isConnected ? 'connected' : 'disconnected');
          
          if (!isConnected) {
            console.error("Database connection failed");
            toast.error("Database connection issue. Please check your network connection.");
          }
        }
      } catch (error) {
        if (isMounted) {
          setConnectionStatus('disconnected');
          console.error('Connection check failed:', error);
        }
      }
    };
    
    checkConnection();
    
    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  // Retry connection when disconnected
  const handleRetryConnection = () => {
    setConnectionStatus('checking');
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm border border-border/50 shadow-soft">
        {/* Only show ConnectionStatus if checking or disconnected */}
        {connectionStatus !== 'connected' && (
          <ConnectionStatus 
            status={connectionStatus} 
            onRetry={handleRetryConnection} 
          />
        )}
        
        <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          {/* Login Form */}
          <TabsContent value="login">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-4">Loading login form...</div>}>
                <LoginForm connectionStatus={connectionStatus} />
              </Suspense>
            </CardContent>
          </TabsContent>
          
          {/* Register Form */}
          <TabsContent value="register">
            <CardHeader>
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>
                Enter your details to create a new account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-4">Loading registration form...</div>}>
                <RegisterForm connectionStatus={connectionStatus} />
              </Suspense>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthForm;
