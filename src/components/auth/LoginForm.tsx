
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui-components';
import { AlertCircle, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  connectionStatus: 'checking' | 'connected' | 'disconnected';
}

const LoginForm = ({ connectionStatus }: LoginFormProps) => {
  const { signIn, loading: authLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Generate more unique login ID with device timestamp for better debugging
  const [loginAttemptId] = useState(() => `login_${Math.random().toString(36).substring(2, 9)}_${new Date().getTime().toString(36)}`);

  // Log component mount to track potential race conditions
  useEffect(() => {
    console.log(`LoginForm mounted (instance: ${loginAttemptId})`);

    // Clean up any overlapping form state when component unmounts
    return () => {
      console.log(`LoginForm unmounting (instance: ${loginAttemptId})`);
    };
  }, [loginAttemptId]);

  // Login form handler
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle login submission with enhanced multi-device support
  const onLoginSubmit = async (values: LoginFormValues) => {
    if (connectionStatus === 'disconnected') {
      setFormError('Cannot connect to the database. Please check your internet connection and try again.');
      toast.error('Database connection error. Please check your internet connection.');
      return;
    }
    
    setFormError(null);
    setIsEmailNotConfirmed(false);
    setIsSubmitting(true);
    
    try {
      console.log(`Attempting to sign in with: ${values.email} (instance: ${loginAttemptId})`);
      
      // Clear any potentially conflicting auth data in localStorage
      try {
        const keysToPreserve = ['supabase.auth.token'];
        Object.keys(localStorage).forEach(key => {
          if (!keysToPreserve.includes(key) && key.includes('supabase.auth.') && key !== 'supabase.auth.token') {
            console.log(`Pre-login cleanup: removing ${key} (instance: ${loginAttemptId})`);
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn(`Error cleaning localStorage before login (instance: ${loginAttemptId}):`, e);
      }
      
      const result = await signIn(values.email, values.password);
      console.log(`Sign in result (instance: ${loginAttemptId}):`, result);
    } catch (error: any) {
      console.error(`Login error (instance: ${loginAttemptId}):`, error);
      
      if (error.message?.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
        setIsEmailNotConfirmed(true);
        setUnconfirmedEmail(values.email);
        setFormError('Your email has not been confirmed. Please check your inbox for the confirmation link.');
        toast.error('Email not confirmed. Please check your inbox.');
      } else if (error.message?.includes('Invalid login credentials')) {
        setFormError('Invalid email or password. Please try again.');
        toast.error('Invalid login credentials');
      } else if (error.message?.includes('rate limit')) {
        setFormError('Too many login attempts. Please try again later.');
        toast.error('Rate limit exceeded');
      } else {
        setFormError(error.message || 'Failed to sign in. Please check your credentials.');
        toast.error('Login failed. Please try again.');
      }
    } finally {
      // Always ensure we reset the submitting state
      setIsSubmitting(false);
    }
  };

  // Calculate the actual loading state by combining both states
  const isLoading = isSubmitting || authLoading;
  const isDisabled = connectionStatus === 'checking' || isLoading;

  return (
    <>
      {isEmailNotConfirmed && (
        <Alert variant="warning" className="mb-4 bg-amber-50 border-amber-200">
          <Mail className="h-4 w-4" />
          <AlertTitle>Email confirmation required</AlertTitle>
          <AlertDescription>
            Please check your inbox for {unconfirmedEmail} and click the confirmation link to activate your account.
          </AlertDescription>
        </Alert>
      )}
        
      {formError && !isEmailNotConfirmed && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
        
      <Form {...loginForm}>
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          <FormField
            control={loginForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="your.email@example.com" 
                    type="email" 
                    {...field} 
                    className="input-focus-ring"
                    disabled={isDisabled}
                    autoComplete="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={loginForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Your password" 
                    type="password" 
                    {...field} 
                    className="input-focus-ring"
                    disabled={isDisabled}
                    autoComplete="current-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full bg-brand-500 hover:bg-brand-600" 
            disabled={isDisabled}
          >
            {isLoading ? <LoadingSpinner /> : 'Sign In'}
          </Button>
        </form>
      </Form>
    </>
  );
};

export default LoginForm;
