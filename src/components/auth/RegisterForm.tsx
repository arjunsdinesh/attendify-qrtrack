
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingSpinner } from '@/components/ui-components';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Registration form schema
const registerSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password' }),
  role: z.enum(['student', 'teacher'], { required_error: 'Please select a role' }),
  registerNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(
  (data) => !(data.role === 'student' && (!data.registerNumber || data.registerNumber.trim() === '')),
  {
    message: "University register number is required for students",
    path: ["registerNumber"],
  }
);

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  connectionStatus: 'checking' | 'connected' | 'disconnected';
}

const RegisterForm = ({ connectionStatus }: RegisterFormProps) => {
  const { signUp, loading, initialRole, setInitialRole } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showRegisterNumber, setShowRegisterNumber] = useState(initialRole === 'student');

  // Register form handler
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: initialRole,
      registerNumber: '',
    },
    mode: 'onChange',
  });

  // Watch role to show/hide register number field
  const selectedRole = registerForm.watch('role');
  
  useEffect(() => {
    setShowRegisterNumber(selectedRole === 'student');
  }, [selectedRole]);

  // Handle registration submission
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    if (connectionStatus === 'disconnected') {
      setFormError('Cannot connect to the database. Please check your Supabase configuration.');
      return;
    }
    
    setFormError(null);
    try {
      await signUp(
        values.email, 
        values.password, 
        values.role, 
        values.fullName,
        values.registerNumber
      );
    } catch (error: any) {
      setFormError(error.message || 'Failed to create account. Please check your Supabase configuration.');
    }
  };

  // Handle role change in registration form
  const handleRoleChange = (value: 'student' | 'teacher') => {
    setInitialRole(value);
    setShowRegisterNumber(value === 'student');
  };

  return (
    <>
      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      
      <Form {...registerForm}>
        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
          <FormField
            control={registerForm.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="John Doe" 
                    {...field} 
                    className="input-focus-ring"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>I am a</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleRoleChange(value as 'student' | 'teacher');
                    }}
                    defaultValue={field.value}
                    className="flex space-x-2"
                  >
                    <FormItem className="flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="student" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Student
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="teacher" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Teacher
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {showRegisterNumber && (
            <FormField
              control={registerForm.control}
              name="registerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>University Register Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your university register number" 
                      {...field} 
                      className="input-focus-ring"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={registerForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Create a password" 
                    type="password" 
                    {...field} 
                    className="input-focus-ring"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={registerForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Confirm your password" 
                    type="password" 
                    {...field} 
                    className="input-focus-ring"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full bg-brand-500 hover:bg-brand-600" 
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Create Account'}
          </Button>
        </form>
      </Form>
    </>
  );
};

export default RegisterForm;
