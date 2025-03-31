
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
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('connected');
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Check Supabase connection on component mount with optimistic rendering
  useEffect(() => {
    console.log("AuthForm mounted, checking connection...");
    
    // Immediately assume we're connected to prevent UI blocking
    setConnectionStatus('connected');
    setIsLoading(false);
    
    // Check in the background with timeout to prevent blocking
    const checkConnection = async () => {
      try {
        // Use Promise.race with a timeout to prevent blocking
        const connectionPromise = checkSupabaseConnection();
        const timeoutPromise = new Promise<boolean>(resolve => {
          setTimeout(() => resolve(true), 3000);
        });
        
        const isConnected = await Promise.race([connectionPromise, timeoutPromise]);
        console.log("Connection check result:", isConnected ? "connected" : "disconnected");
        
        if (!isConnected) {
          setConnectionStatus('disconnected');
          // Only show toast if user explicitly retried
          if (retryCount > 0) {
            toast.error("Database connection issue. Please check your network connection.");
          }
        }
      } catch (error) {
        console.error('Connection check failed:', error);
        // Still keep the UI usable
        setConnectionStatus('connected');
      }
    };
    
    // Delay the check slightly to prioritize UI rendering
    const timerId = setTimeout(() => {
      checkConnection();
    }, 100);
    
    return () => clearTimeout(timerId);
  }, [retryCount]);

  // Retry connection when disconnected
  const handleRetryConnection = async () => {
    console.log("Retrying connection...");
    setConnectionStatus('checking');
    setRetryCount(prev => prev + 1);
  };

  console.log("Rendering AuthForm with connectionStatus:", connectionStatus, "isLoading:", isLoading);

  // Always render the form to prevent loading screens, regardless of connection status
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
        
        <Tabs 
          value={authMode} 
          onValueChange={(value) => setAuthMode(value as 'login' | 'register')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          {/* Login Form */}
          <TabsContent value="login" className="w-full">
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
          <TabsContent value="register" className="w-full">
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
