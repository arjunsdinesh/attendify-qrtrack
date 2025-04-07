
import { AttendanceHistoryView } from './AttendanceHistoryView';

const AttendanceHistory = ({ userId }: { userId: string }) => {
  return <AttendanceHistoryView userId={userId} />;
};

export default AttendanceHistory;
