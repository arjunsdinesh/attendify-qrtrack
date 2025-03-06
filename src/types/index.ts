
export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface StudentProfile extends UserProfile {
  registerNumber: string;
  rollNumber: string;
  department: string;
  semester: number;
  classId: string;
}

export interface TeacherProfile extends UserProfile {
  employeeId: string;
  department: string;
  designation: string;
}

export interface Class {
  id: string;
  name: string;
  courseCode: string;
  department: string;
  semester: number;
  teacherId: string;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  createdBy: string;
  qrSecret: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  timestamp: string;
  createdAt: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface QRCodeData {
  sessionId: string;
  timestamp: number;
  secret: string;
  signature: string;
}
