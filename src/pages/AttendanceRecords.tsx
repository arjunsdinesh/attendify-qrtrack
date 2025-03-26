
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Calendar, Clock, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui-components';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Define interfaces for type safety
interface SessionClass {
  name: string;
  course_code: string;
}

interface SessionDetails {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  classes: SessionClass;
}

interface StudentProfile {
  register_number?: string;
  roll_number?: string;
  department?: string;
  semester?: number;
}

interface StudentData {
  id: string;
  full_name: string;
  email: string;
  student_profiles: StudentProfile[];
}

interface AttendanceRecord {
  id: string;
  timestamp: string;
  student: StudentData;
}

const AttendanceRecords = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect if not authenticated or not a teacher
    if (!loading && (!user || user.role !== 'teacher')) {
      toast.error('Only teachers can view attendance records');
      navigate('/');
    }
  }, [user, loading, navigate]);
  
  useEffect(() => {
    fetchSessions();
  }, [user]);
  
  const fetchSessions = async () => {
    if (!user) return;
    
    try {
      setLoadingSessions(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          is_active,
          classes:class_id(name, course_code)
        `)
        .eq('created_by', user.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
        
      if (error) throw error;
      
      console.log('Fetched sessions:', data);
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load attendance sessions');
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };
  
  const fetchSessionRecords = async (sessionId: string) => {
    if (!sessionId) return;
    
    try {
      setLoadingRecords(true);
      setError(null);
      setSelectedSession(sessionId);
      
      // First get the session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          is_active,
          classes:class_id(name, course_code)
        `)
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      // Ensure proper typing of the sessionData
      if (sessionData) {
        // Handle the classes data correctly - it's returned as an object by Supabase
        const classData = sessionData.classes as unknown as SessionClass;
        
        setSessionDetails({
          id: sessionData.id,
          date: sessionData.date,
          start_time: sessionData.start_time,
          end_time: sessionData.end_time,
          is_active: sessionData.is_active,
          classes: {
            name: classData.name,
            course_code: classData.course_code
          }
        });
      }
      
      // Then get the attendance records with detailed student info
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          timestamp,
          student:student_id(
            id,
            full_name,
            email,
            student_profiles(
              register_number,
              roll_number,
              department,
              semester
            )
          )
        `)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
        
      if (error) {
        console.error('Error fetching records:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        setRecords([]);
        toast.info('No attendance records found for this session');
        return;
      }
      
      console.log('Fetched records:', data);
      
      // Properly transform the data to match our AttendanceRecord interface
      const transformedRecords: AttendanceRecord[] = data.map(record => {
        // Log the structure to debug
        console.log('Record student data:', record.student);
        
        return {
          id: record.id,
          timestamp: record.timestamp,
          student: record.student as StudentData // Cast directly to StudentData
        };
      });
      
      setRecords(transformedRecords);
    } catch (error: any) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to load attendance records');
      setError('Failed to load attendance records: ' + error.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Show loading or redirect if not a teacher
  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <LoadingSpinner className="h-8 w-8 mx-auto" />
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Attendance Records</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate('/teacher')} 
          >
            ← Back to Dashboard
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>Select a session to view attendance</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="flex justify-center p-4">
                    <LoadingSpinner className="h-6 w-6" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No sessions found. Create a session first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <Button
                        key={session.id}
                        variant={selectedSession === session.id ? "default" : "outline"}
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => fetchSessionRecords(session.id)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            {session.classes.name} ({session.classes.course_code})
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(parseISO(session.date), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                {sessionDetails ? (
                  <>
                    <CardTitle>{sessionDetails.classes.name}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(parseISO(sessionDetails.date), 'dd MMMM yyyy')}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(parseISO(sessionDetails.start_time), 'h:mm a')}
                        {sessionDetails.end_time && (
                          <> - {format(parseISO(sessionDetails.end_time), 'h:mm a')}</>
                        )}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        {records.length} students attended
                      </div>
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>
                      Select a session to view attendance details
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent>
                {loadingRecords ? (
                  <div className="flex justify-center p-8">
                    <LoadingSpinner className="h-8 w-8" />
                  </div>
                ) : !selectedSession ? (
                  <div className="text-center p-8 text-muted-foreground">
                    Select a session from the left to view attendance records
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No attendance records for this session
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Register Number</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.student.full_name}
                          </TableCell>
                          <TableCell>
                            {record.student.student_profiles[0]?.register_number || '-'}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(record.timestamp), 'h:mm a')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceRecords;
