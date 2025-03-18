
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';

const AttendanceRecords = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  
  // Redirect if not authenticated or not a teacher
  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Load teacher's sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select(`
            id,
            start_time,
            end_time,
            date,
            is_active,
            class_id,
            classes(name, course_code)
          `)
          .eq('created_by', user.id)
          .order('start_time', { ascending: false });
        
        if (error) throw error;
        
        // Format the sessions data for display
        const formattedSessions = data?.map(session => {
          // Extract class name safely
          let className = 'Unknown Class';
          let courseCode = '';
          
          // Handle case where classes might be returned as an array or as an object
          const classData = session.classes;
          if (classData) {
            if (Array.isArray(classData) && classData.length > 0) {
              className = classData[0]?.name || 'Unknown Class';
              courseCode = classData[0]?.course_code || '';
            } else if (typeof classData === 'object' && classData !== null) {
              className = classData.name || 'Unknown Class';
              courseCode = classData.course_code || '';
            }
          }
          
          return {
            id: session.id,
            class_name: className,
            course_code: courseCode,
            date: session.date,
            start_time: session.start_time,
            end_time: session.end_time,
            is_active: session.is_active
          };
        }) || [];
        
        setSessions(formattedSessions);
      } catch (error: any) {
        console.error('Error fetching sessions:', error);
        toast.error('Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [user]);

  // Load attendance records for the selected session
  const loadRecords = async () => {
    if (!selectedSession) return;
    
    try {
      setLoading(true);
      console.log('Loading records for session:', selectedSession);
      
      // First get the session details to show class info
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          classes(name, course_code, department)
        `)
        .eq('id', selectedSession)
        .single();
      
      if (sessionError) throw sessionError;
      
      setSessionDetails(sessionData);
      
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
        .eq('session_id', selectedSession)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error fetching attendance records:', error);
        throw error;
      }
      
      console.log('Fetched records:', data);
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  // Load records when a session is selected
  useEffect(() => {
    if (selectedSession) {
      loadRecords();
    } else {
      setRecords([]);
      setSessionDetails(null);
    }
  }, [selectedSession]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format just the date part
  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <LoadingSpinner className="h-8 w-8" />
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/teacher-dashboard')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <Card className="w-full mb-6">
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              View attendance records for your class sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session">Select Session</Label>
                <Select
                  value={selectedSession}
                  onValueChange={setSelectedSession}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.class_name} ({session.course_code}) - {formatDateOnly(session.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {loading && selectedSession ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : records.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              {sessionDetails && (
                <div className="mb-6 bg-muted/40 p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Session Details</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Class:</span> {sessionDetails.classes?.name}
                    </div>
                    <div>
                      <span className="font-medium">Course Code:</span> {sessionDetails.classes?.course_code}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span> {sessionDetails.classes?.department}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {formatDateOnly(sessionDetails.date)}
                    </div>
                    <div>
                      <span className="font-medium">Start Time:</span> {formatDate(sessionDetails.start_time)}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {sessionDetails.is_active ? 'Active' : 'Ended'}
                    </div>
                  </div>
                </div>
              )}
              
              <h3 className="text-lg font-medium mb-4">
                Student Attendance ({records.length} students)
              </h3>
              
              <div className="bg-muted p-2 rounded-md grid grid-cols-12 font-medium text-sm">
                <div className="col-span-1">No.</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Register No.</div>
                <div className="col-span-2">Roll No.</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Attendance Time</div>
              </div>
              
              <div className="space-y-1 mt-1">
                {records.map((record, index) => {
                  const student = record.student;
                  const studentProfile = student?.student_profiles?.[0] || {};
                  
                  return (
                    <div key={record.id} className="grid grid-cols-12 p-2 hover:bg-muted/50 rounded-md text-sm">
                      <div className="col-span-1">{index + 1}</div>
                      <div className="col-span-3">{student?.full_name || '-'}</div>
                      <div className="col-span-2">{studentProfile?.register_number || '-'}</div>
                      <div className="col-span-2">{studentProfile?.roll_number || '-'}</div>
                      <div className="col-span-2">{studentProfile?.department || '-'}</div>
                      <div className="col-span-2">{formatDate(record.timestamp)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : selectedSession ? (
          <div className="text-center p-8 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">No attendance records found for this session.</p>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default AttendanceRecords;
