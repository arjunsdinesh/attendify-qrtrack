
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  
  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/');
      return;
    }

    // Load student's attendance records
    const fetchAttendanceHistory = async () => {
      try {
        setLoading(true);
        
        console.log('Fetching attendance records for student:', user.id);
        
        const { data, error } = await supabase
          .from('attendance_records')
          .select(`
            id,
            timestamp,
            session_id,
            attendance_sessions(
              id,
              start_time,
              end_time,
              class_id,
              classes(
                id,
                name
              )
            )
          `)
          .eq('student_id', user.id)
          .order('timestamp', { ascending: false });
        
        if (error) {
          console.error('Error fetching attendance records:', error);
          throw error;
        }
        
        console.log('Fetched records:', data);
        setRecords(data || []);
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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  // Get class name from record
  const getClassName = (record: any) => {
    // Handle case where classes might be an array due to Supabase response format
    if (record.attendance_sessions) {
      if (record.attendance_sessions.classes) {
        if (Array.isArray(record.attendance_sessions.classes)) {
          // If classes is an array, get the first element's name
          if (record.attendance_sessions.classes.length > 0) {
            return record.attendance_sessions.classes[0].name || '-';
          }
        } else if (typeof record.attendance_sessions.classes === 'object') {
          // If classes is an object, get the name property
          return record.attendance_sessions.classes.name || '-';
        }
      }
    }
    return '-';
  };

  // Get session date from record
  const getSessionDate = (record: any) => {
    if (record.attendance_sessions && record.attendance_sessions.start_time) {
      return formatDate(record.attendance_sessions.start_time);
    }
    return '-';
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p>Loading...</p>
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
                      <div className="col-span-4">{getClassName(record)}</div>
                      <div className="col-span-4">{getSessionDate(record)}</div>
                      <div className="col-span-3">{formatDate(record.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <Alert className="mb-4">
                  <AlertDescription>
                    You haven't marked attendance for any classes yet.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceHistory;
