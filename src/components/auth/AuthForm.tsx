
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { checkSupabaseConnection } from '@/utils/supabase';
import { toast } from 'sonner';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ConnectionStatus from './ConnectionStatus';

const AuthForm = () => {
  const { initialRole } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  // Check Supabase connection on component mount - with optimized timing
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkSupabaseConnection();
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        setConnectionStatus('disconnected');
        console.error('Connection check failed:', error);
      }
    };
    
    // Add a small delay to allow other critical UI elements to load first
    const timeoutId = setTimeout(() => {
      checkConnection();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [retryCount]);

  // Retry connection when disconnected
  const handleRetryConnection = async () => {
    setConnectionStatus('checking');
    setRetryCount(prev => prev + 1);
    try {
      const isConnected = await checkSupabaseConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      if (isConnected) {
        toast.success("Connection restored!");
      } else {
        toast.error("Still unable to connect. Please try again.");
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('Retry connection failed:', error);
      toast.error("Connection check failed.");
    }
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
              <LoginForm connectionStatus={connectionStatus} />
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
              <RegisterForm connectionStatus={connectionStatus} />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthForm;
