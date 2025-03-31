
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthForm = () => {
  const { initialRole } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Generate a unique form instance ID
  const [formInstanceId] = useState(() => `form_${Math.random().toString(36).substring(2, 9)}`);

  // Clean up potentially problematic session data
  const clearStaleSessionData = () => {
    try {
      // Be very selective about what we clear
      const keysToPreserve = ['supabase.auth.token'];
      
      // Only clean up obviously stale data
      Object.keys(localStorage).forEach(key => {
        if (!keysToPreserve.includes(key) && (key.includes('supabase.auth.') && key !== 'supabase.auth.token')) {
          console.log(`Cleaning up potentially stale auth data: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.log('Error cleaning session data, continuing anyway');
    }
  };
    
  // Run cleanup in non-blocking way
  setTimeout(clearStaleSessionData, 300);

  // Always render form immediately
  return (
    <div className="max-w-md w-full mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm border border-border/50 shadow-soft">
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
              <LoginForm connectionStatus="connected" />
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
              <RegisterForm connectionStatus="connected" />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthForm;
