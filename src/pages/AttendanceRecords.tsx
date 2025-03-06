
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  
  if (!user || user.role !== 'teacher') {
    navigate('/');
    return null;
  }

  // Load teacher's sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('teacher_id', user.id)
          .order('start_time', { ascending: false });
        
        if (error) throw error;
        
        setSessions(data || []);
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
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          timestamp,
          profiles:student_id (
            id,
            full_name,
            register_number,
            roll_number,
            department
          )
        `)
        .eq('session_id', selectedSession)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
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
    }
  }, [selectedSession]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/teacher')} 
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
                        {session.class_name} - {formatDate(session.start_time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : records.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">
                {sessions.find(s => s.id === selectedSession)?.class_name} - 
                {formatDate(sessions.find(s => s.id === selectedSession)?.start_time)}
              </h3>
              
              <div className="bg-muted p-2 rounded-md grid grid-cols-12 font-medium">
                <div className="col-span-1">No.</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Reg. Number</div>
                <div className="col-span-2">Roll Number</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Time</div>
              </div>
              
              <div className="space-y-2 mt-2">
                {records.map((record, index) => (
                  <div key={record.id} className="grid grid-cols-12 p-2 hover:bg-muted/50 rounded-md">
                    <div className="col-span-1">{index + 1}</div>
                    <div className="col-span-3">{record.profiles?.full_name || '-'}</div>
                    <div className="col-span-2">{record.profiles?.register_number || '-'}</div>
                    <div className="col-span-2">{record.profiles?.roll_number || '-'}</div>
                    <div className="col-span-2">{record.profiles?.department || '-'}</div>
                    <div className="col-span-2">{formatDate(record.timestamp)}</div>
                  </div>
                ))}
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
