
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/utils/supabase';
import { LoadingSpinner } from '@/components/ui-components';
import { formatDate } from '@/utils/date-utils';
import { toast } from 'sonner';

// Define proper types for our data
interface ClassInfo {
  name: string;
  course_code: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  class_id: string;
  class_info: ClassInfo;
}

interface SessionData {
  id: string;
  class_id: string;
  start_time: string;
  classes: {
    id: string;
    name: string;
    course_code: string;
  };
}

interface AttendanceData {
  id: string;
  timestamp: string;
  attendance_sessions: SessionData;
}

const AttendanceHistory = ({ userId }: { userId: string }) => {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [view, setView] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  useEffect(() => {
    fetchAttendanceHistory();
  }, [userId, view]);
  
  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          timestamp,
          attendance_sessions!inner(
            id,
            class_id,
            start_time,
            classes!inner(
              id,
              name,
              course_code
            )
          )
        `)
        .eq('student_id', userId)
        .order('timestamp', { ascending: false });
      
      // Apply date filters
      const now = new Date();
      if (view === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('timestamp', today);
      } else if (view === 'week') {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        query = query.gte('timestamp', oneWeekAgo.toISOString());
      } else if (view === 'month') {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        query = query.gte('timestamp', oneMonthAgo.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to the expected format
      const formattedData = data.map((record: AttendanceData) => ({
        id: record.id,
        date: record.timestamp,
        class_id: record.attendance_sessions.class_id,
        class_info: {
          name: record.attendance_sessions.classes.name,
          course_code: record.attendance_sessions.classes.course_code
        }
      }));
      
      setAttendanceRecords(formattedData);
    } catch (error: any) {
      console.error('Error fetching attendance history:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };
  
  // Group records by month for the timeline view
  const groupedByMonth = attendanceRecords.reduce((acc, record) => {
    const date = new Date(record.date);
    const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    
    acc[monthYear].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);
  
  // Sort months chronologically
  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Attendance History</CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : attendanceRecords.length > 0 ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                  <p className="text-2xl font-bold">{attendanceRecords.length}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {attendanceRecords.filter(r => {
                      const date = new Date(r.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && 
                             date.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">
                    {attendanceRecords.filter(r => {
                      const date = new Date(r.date);
                      const now = new Date();
                      const weekStart = new Date(now);
                      weekStart.setDate(now.getDate() - now.getDay());
                      return date >= weekStart;
                    }).length}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">
                    {attendanceRecords.filter(r => {
                      const date = new Date(r.date);
                      const now = new Date();
                      return date.getDate() === now.getDate() &&
                             date.getMonth() === now.getMonth() &&
                             date.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Timeline</h3>
              <div className="space-y-8">
                {sortedMonths.map(month => (
                  <div key={month}>
                    <h4 className="text-md font-medium text-muted-foreground mb-2">{month}</h4>
                    <div className="space-y-2">
                      {groupedByMonth[month].map(record => (
                        <div key={record.id} className="flex items-center p-3 rounded-lg border hover:bg-muted/50">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                            <span className="text-xl font-semibold">
                              {new Date(record.date).getDate()}
                            </span>
                          </div>
                          <div className="flex-grow">
                            <p className="font-medium">{record.class_info.name}</p>
                            <p className="text-sm text-muted-foreground">{record.class_info.course_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatDate(record.date, 'time')}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(record.date, 'date')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No attendance records found. Records will appear here once you start marking your attendance.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;
