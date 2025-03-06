
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';

// Define the structure of the data returned from the Supabase query
interface AttendanceSessionData {
  id: string;
  class_name: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecordData {
  id: string;
  timestamp: string;
  attendance_sessions: AttendanceSessionData;
}

// Define the raw data structure as we receive it from Supabase
interface RawAttendanceRecord {
  id: string;
  timestamp: string;
  attendance_sessions: {
    id: string;
    class_name: string;
    start_time: string;
    end_time: string;
  };
}

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecordData[]>([]);
  
  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/');
      return;
    }

    // Load student's attendance records
    const fetchAttendanceHistory = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('attendance_records')
          .select(`
            id,
            timestamp,
            attendance_sessions!inner(
              id,
              class_name,
              start_time,
              end_time
            )
          `)
          .eq('student_id', user.id)
          .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        // Use proper type assertion
        const rawData = data as unknown;
        const typedData = rawData as RawAttendanceRecord[];
        
        const formattedRecords: AttendanceRecordData[] = typedData.map(record => ({
          id: record.id,
          timestamp: record.timestamp,
          attendance_sessions: {
            id: record.attendance_sessions.id,
            class_name: record.attendance_sessions.class_name,
            start_time: record.attendance_sessions.start_time,
            end_time: record.attendance_sessions.end_time
          }
        }));
        
        setRecords(formattedRecords);
      } catch (error: any) {
        console.error('Error fetching attendance records:', error);
        toast.error('Failed to load attendance history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceHistory();
  }, [user, navigate]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/student')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Your Attendance History</CardTitle>
            <CardDescription>
              View all your recorded attendance across different classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            ) : records.length > 0 ? (
              <div>
                <div className="bg-muted p-2 rounded-md grid grid-cols-12 font-medium">
                  <div className="col-span-1">No.</div>
                  <div className="col-span-4">Class</div>
                  <div className="col-span-4">Session Date</div>
                  <div className="col-span-3">Marked At</div>
                </div>
                
                <div className="space-y-2 mt-2">
                  {records.map((record, index) => (
                    <div key={record.id} className="grid grid-cols-12 p-2 hover:bg-muted/50 rounded-md">
                      <div className="col-span-1">{index + 1}</div>
                      <div className="col-span-4">{record.attendance_sessions?.class_name || '-'}</div>
                      <div className="col-span-4">{formatDate(record.attendance_sessions?.start_time)}</div>
                      <div className="col-span-3">{formatDate(record.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">You haven't marked attendance for any classes yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceHistory;
