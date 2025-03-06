
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingState, EmptyState } from '@/components/ui-components';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AttendanceRecord {
  id: string;
  date: string;
  className: string;
  courseCode: string;
  status: 'present' | 'absent';
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

interface ClassAttendance {
  name: string;
  courseCode: string;
  present: number;
  absent: number;
  percentage: number;
}

interface AttendanceHistoryProps {
  role: 'student' | 'teacher';
  studentId?: string; // Optional: for teacher viewing a specific student
  classId?: string; // Optional: for filtering by class
}

const AttendanceHistory = ({ role, studentId, classId }: AttendanceHistoryProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [classStats, setClassStats] = useState<ClassAttendance[]>([]);
  const [view, setView] = useState<'list' | 'chart'>('list');

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        
        if (!user) return;
        
        // Get the target student ID (either the logged-in student or the selected student for a teacher)
        const targetStudentId = role === 'student' ? user.id : studentId;
        
        if (role === 'student' || (role === 'teacher' && targetStudentId)) {
          // Fetch attendance records for a specific student
          const query = supabase
            .from('attendance_records')
            .select(`
              id,
              timestamp,
              attendance_sessions (
                id,
                date,
                class_id,
                classes (
                  name,
                  course_code
                )
              )
            `)
            .eq('student_id', targetStudentId);
          
          // Add class filter if provided
          if (classId) {
            query.eq('attendance_sessions.class_id', classId);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // Format the records
          const formattedRecords = data.map(record => ({
            id: record.id,
            date: format(new Date(record.timestamp), 'MMM dd, yyyy HH:mm'),
            className: record.attendance_sessions.classes.name,
            courseCode: record.attendance_sessions.classes.course_code,
            status: 'present' as 'present'
          }));
          
          setRecords(formattedRecords);
          
          // Calculate class-based statistics
          const classList = data.reduce((acc: { [key: string]: any }, record) => {
            const classId = record.attendance_sessions.class_id;
            const className = record.attendance_sessions.classes.name;
            const courseCode = record.attendance_sessions.classes.course_code;
            
            if (!acc[classId]) {
              acc[classId] = {
                name: className,
                courseCode: courseCode,
                present: 0,
                absent: 0,
                percentage: 0
              };
            }
            
            acc[classId].present += 1;
            
            return acc;
          }, {});
          
          // Fetch total sessions for percentage calculation
          const { data: sessionData, error: sessionError } = await supabase
            .from('attendance_sessions')
            .select('id, class_id')
            .order('date', { ascending: false });
          
          if (sessionError) throw sessionError;
          
          // Update class stats with total sessions
          sessionData.forEach((session) => {
            const classId = session.class_id;
            if (classList[classId]) {
              classList[classId].total = (classList[classId].total || 0) + 1;
            }
          });
          
          // Calculate percentages
          Object.keys(classList).forEach((classId) => {
            const total = classList[classId].total || 0;
            classList[classId].percentage = total > 0 
              ? Math.round((classList[classId].present / total) * 100) 
              : 0;
            classList[classId].absent = total - classList[classId].present;
          });
          
          setClassStats(Object.values(classList));
          
          // Calculate overall statistics
          const totalSessions = Object.values(classList).reduce(
            (sum: number, cls: any) => sum + cls.total, 0
          );
          const presentSessions = Object.values(classList).reduce(
            (sum: number, cls: any) => sum + cls.present, 0
          );
          
          setStats({
            total: totalSessions,
            present: presentSessions,
            absent: totalSessions - presentSessions,
            percentage: totalSessions > 0 
              ? Math.round((presentSessions / totalSessions) * 100) 
              : 0
          });
          
        } else if (role === 'teacher') {
          // For a teacher viewing overall class attendance (when no student is selected)
          // This would aggregate data for all students in selected class
          const { data: sessionData, error: sessionError } = await supabase
            .from('attendance_sessions')
            .select('id, date, class_id, classes(name, course_code)')
            .eq('created_by', user.id);
          
          if (sessionError) throw sessionError;
          
          // This is just a simplified example - in a real app you'd do more aggregation here
          const formattedRecords = await Promise.all(sessionData.map(async (session) => {
            // Count attendees for this session
            const { count, error: countError } = await supabase
              .from('attendance_records')
              .select('*', { count: 'exact' })
              .eq('session_id', session.id);
            
            if (countError) throw countError;
            
            return {
              id: session.id,
              date: format(new Date(session.date), 'MMM dd, yyyy'),
              className: session.classes.name,
              courseCode: session.classes.course_code,
              status: `${count} attendees` as any
            };
          }));
          
          setRecords(formattedRecords);
        }
        
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        toast.error('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [user, role, studentId, classId]);

  // Prepare chart data
  const pieChartData = [
    { name: 'Present', value: stats.present, color: '#22c55e' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' }
  ];

  const barChartData = classStats.map(cls => ({
    name: cls.courseCode,
    present: cls.present,
    absent: cls.absent
  }));

  if (loading) {
    return <LoadingState message="Loading attendance data..." />;
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title="No attendance records found"
        description="No attendance records have been recorded yet."
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attendance History</CardTitle>
        <Tabs defaultValue={view} onValueChange={(value) => setView(value as 'list' | 'chart')}>
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="chart">Charts</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {view === 'list' ? (
          <div className="space-y-4">
            {role === 'student' && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-primary/10 p-4 rounded-lg text-center">
                  <div className="text-sm font-medium text-muted-foreground">Total Classes</div>
                  <div className="text-2xl font-bold mt-1">{stats.total}</div>
                </div>
                <div className="bg-teal-500/10 p-4 rounded-lg text-center">
                  <div className="text-sm font-medium text-muted-foreground">Present</div>
                  <div className="text-2xl font-bold mt-1 text-teal-600">{stats.present}</div>
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg text-center">
                  <div className="text-sm font-medium text-muted-foreground">Absent</div>
                  <div className="text-2xl font-bold mt-1 text-red-600">{stats.absent}</div>
                </div>
                <div className="bg-brand-500/10 p-4 rounded-lg text-center">
                  <div className="text-sm font-medium text-muted-foreground">Percentage</div>
                  <div className="text-2xl font-bold mt-1 text-brand-600">{stats.percentage}%</div>
                </div>
              </div>
            )}
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.className}</TableCell>
                    <TableCell>{record.courseCode}</TableCell>
                    <TableCell>
                      {typeof record.status === 'string' && record.status === 'present' ? (
                        <Badge className="bg-teal-500">Present</Badge>
                      ) : typeof record.status === 'string' && record.status === 'absent' ? (
                        <Badge variant="destructive">Absent</Badge>
                      ) : (
                        <span>{record.status}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-8">
            {role === 'student' && stats.total > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-medium mb-4">Overall Attendance</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} classes`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {classStats.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Attendance by Course</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="present" name="Present" fill="#22c55e" />
                          <Bar dataKey="absent" name="Absent" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {role === 'teacher' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Recent Session Attendance</h3>
                {/* Simplified visualization for teacher view - in a real app you would create more detailed charts */}
                <div className="space-y-3">
                  {records.slice(0, 5).map(record => (
                    <div key={record.id} className="flex justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <div className="font-medium">{record.className}</div>
                        <div className="text-sm text-muted-foreground">{record.date}</div>
                      </div>
                      <div>{record.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;
