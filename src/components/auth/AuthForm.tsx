
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
  const [isLoading, setIsLoading] = useState(true);

  // Check Supabase connection on component mount
  useEffect(() => {
    console.log("AuthForm mounted, checking connection...");
    
    let isMounted = true;
    
    const checkConnection = async () => {
      try {
        // First assume connected to avoid UI delays
        const connectionTimeout = setTimeout(() => {
          if (isMounted && connectionStatus === 'checking') {
            console.log("Connection check taking too long, assuming connected for UI");
            setConnectionStatus('connected');
            setIsLoading(false);
          }
        }, 800);
        
        console.log("Starting actual connection check");
        const isConnected = await checkSupabaseConnection();
        clearTimeout(connectionTimeout);
        
        if (isMounted) {
          console.log("Connection check result:", isConnected ? "connected" : "disconnected");
          setConnectionStatus(isConnected ? 'connected' : 'disconnected');
          setIsLoading(false);
          
          if (!isConnected && isMounted) {
            toast.error("Database connection issue. Please check your network connection.");
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Connection check failed:', error);
          setConnectionStatus('disconnected');
          setIsLoading(false);
        }
      }
    };
    
    checkConnection();
    
    return () => {
      isMounted = false;
      console.log("AuthForm unmounting");
    };
  }, [retryCount]);

  // Retry connection when disconnected
  const handleRetryConnection = async () => {
    console.log("Retrying connection...");
    setConnectionStatus('checking');
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  };

  console.log("Rendering AuthForm with connectionStatus:", connectionStatus, "isLoading:", isLoading);

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
