import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';

// Schema for student profile
const studentProfileSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required' }),
  email: z.string().email({ message: 'Please enter a valid email' }).optional(),
  registerNumber: z.string().min(2, { message: 'Register number is required' }),
  rollNumber: z.string().min(1, { message: 'Roll number is required' }),
  department: z.string().min(2, { message: 'Department is required' }),
  semester: z.coerce.number().min(1).max(8),
});

// Schema for teacher profile
const teacherProfileSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required' }),
  email: z.string().email({ message: 'Please enter a valid email' }).optional(),
  employeeId: z.string().min(2, { message: 'Employee ID is required' }),
  department: z.string().min(2, { message: 'Department is required' }),
  designation: z.string().min(2, { message: 'Designation is required' }),
});

type StudentProfileValues = z.infer<typeof studentProfileSchema>;
type TeacherProfileValues = z.infer<typeof teacherProfileSchema>;

interface ProfileFormProps {
  role: 'student' | 'teacher';
  onSave: (formData: any) => Promise<void>;
  isLoading: boolean;
}

const ProfileForm = ({ role, onSave, isLoading }: ProfileFormProps) => {
  const { user, studentProfile, teacherProfile } = useAuth();
  
  // Use appropriate form based on role
  const studentForm = useForm<StudentProfileValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      registerNumber: '',
      rollNumber: '',
      department: '',
      semester: 1,
    },
  });
  
  const teacherForm = useForm<TeacherProfileValues>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      employeeId: '',
      department: '',
      designation: '',
    },
  });

  // Populate form with existing data when loaded
  useEffect(() => {
    if (user) {
      if (role === 'student' && studentProfile) {
        studentForm.reset({
          fullName: user.full_name || '',
          email: user.email || '',
          registerNumber: studentProfile.register_number || '',
          rollNumber: studentProfile.roll_number || '',
          department: studentProfile.department || '',
          semester: studentProfile.semester || 1,
        });
      } else if (role === 'teacher' && teacherProfile) {
        teacherForm.reset({
          fullName: user.full_name || '',
          email: user.email || '',
          employeeId: teacherProfile.employee_id || '',
          department: teacherProfile.department || '',
          designation: teacherProfile.designation || '',
        });
      }
    }
  }, [user, studentProfile, teacherProfile, role]);

  return (
    <div className="w-full max-w-xl mx-auto">
      {role === 'student' ? (
        <Form {...studentForm}>
          <form onSubmit={studentForm.handleSubmit(onSave)} className="space-y-4">
            <FormField
              control={studentForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="input-focus-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={studentForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={studentForm.control}
                name="registerNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Register Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="input-focus-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={studentForm.control}
                name="rollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="input-focus-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={studentForm.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input {...field} className="input-focus-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={studentForm.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semester</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-brand-500 hover:bg-brand-600"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner className="h-4 w-4" /> : 'Update Profile'}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...teacherForm}>
          <form onSubmit={teacherForm.handleSubmit(onSave)} className="space-y-4">
            <FormField
              control={teacherForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="input-focus-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={teacherForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={teacherForm.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input {...field} className="input-focus-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={teacherForm.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input {...field} className="input-focus-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={teacherForm.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input {...field} className="input-focus-ring" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-brand-500 hover:bg-brand-600"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner className="h-4 w-4" /> : 'Update Profile'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};

export default ProfileForm;
