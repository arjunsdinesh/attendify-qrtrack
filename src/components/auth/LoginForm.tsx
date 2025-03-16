
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui-components';
import { AlertCircle, Mail, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const { signIn, loading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>('');

  // Login form handler
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle login submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    if (connectionStatus === 'disconnected') {
      setFormError('Cannot connect to the database. Please check your Supabase configuration.');
      return;
    }
    
    setFormError(null);
    setIsEmailNotConfirmed(false);
    
    try {
      await signIn(values.email, values.password);
    } catch (error: any) {
      if (error.message?.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
        setIsEmailNotConfirmed(true);
        setUnconfirmedEmail(values.email);
        setFormError('Your email has not been confirmed. Please check your inbox for the confirmation link.');
      } else {
        setFormError(error.message || 'Failed to sign in. Please check your credentials.');
      }
    }
  };

  const clearEmail = () => {
    loginForm.setValue('email', '');
  };

  return (
    <>
      {isEmailNotConfirmed && (
        <Alert variant="warning" className="mb-6 bg-amber-50 border-amber-200">
          <Mail className="h-4 w-4" />
          <AlertTitle>Email confirmation required</AlertTitle>
          <AlertDescription>
            Please check your inbox for {unconfirmedEmail} and click the confirmation link to activate your account.
          </AlertDescription>
        </Alert>
      )}
        
      {formError && !isEmailNotConfirmed && (
        <Alert variant="destructive" className="mb-6">
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
                    clearable
                    onClear={clearEmail}
                    {...field} 
                    className="bg-background border-gray-200"
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
                    placeholder="Enter your password" 
                    type="password" 
                    {...field} 
                    className="bg-background border-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full h-12 mt-4 bg-black hover:bg-gray-800 text-white font-medium text-base rounded-lg" 
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Continue'}
          </Button>
        </form>
      </Form>
    </>
  );
};

export default LoginForm;
