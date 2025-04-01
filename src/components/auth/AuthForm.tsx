
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
  
  // Generate a unique form instance ID on component mount
  const [formInstanceId] = useState(() => `form_${Math.random().toString(36).substring(2, 9)}`);

  // Simplified connection check with priority on rendering
  useEffect(() => {
    console.log(`AuthForm mounted (instance: ${formInstanceId}), checking connection...`);
    
    // Always render as connected first for faster UI display
    setConnectionStatus('connected');
    setIsLoading(false);
    
    // Clear any stale session data that might be causing conflicts
    const clearStaleSessionData = () => {
      try {
        // Only clear specific keys that might be causing problems
        const keysToPreserve = ['supabase.auth.token'];
        
        // Identify any old or stale login sessions in localStorage
        Object.keys(localStorage).forEach(key => {
          if (!keysToPreserve.includes(key) && (key.includes('supabase.auth.') && key !== 'supabase.auth.token')) {
            console.log(`Cleaning up potentially stale auth data: ${key}`);
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore errors from localStorage operations
        console.log('Error cleaning session data, continuing anyway');
      }
    };
    
    // Attempt to clear any problematic data in a non-blocking way
    setTimeout(clearStaleSessionData, 100);
    
    // Return function that gets called when component is unmounted
    return () => {
      console.log(`AuthForm unmounting (instance: ${formInstanceId})`);
    };
  }, [retryCount, formInstanceId]);

  // Retry connection when disconnected
  const handleRetryConnection = async () => {
    console.log(`Retrying connection (instance: ${formInstanceId})...`);
    setConnectionStatus('connected'); // Optimistic update
    setRetryCount(prev => prev + 1);
  };

  console.log(`Rendering AuthForm (instance: ${formInstanceId}) with connectionStatus:`, connectionStatus);

  // Always render the form regardless of connection status
  return (
    <div className="max-w-md w-full mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm border border-border/50 shadow-soft">
        <ConnectionStatus 
          status={connectionStatus} 
          onRetry={handleRetryConnection} 
        />
        
        <Tabs 
          value={authMode} 
          onValueChange={(value) => setAuthMode(value as 'login' | 'register')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
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
