
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, ListChecks, Clock } from 'lucide-react';

interface ClassCardProps {
  classItem: {
    id: string;
    name: string;
    created_at: string;
    description?: string;
  };
}

const ClassCard = ({ classItem }: ClassCardProps) => {
  const navigate = useNavigate();

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border border-gray-100 bg-white">
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <CardTitle className="text-xl text-gray-800">{classItem.name}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-gray-600">
          <Clock className="h-3.5 w-3.5" />
          Created on {formatDate(classItem.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        <p className="text-sm text-gray-600">
          {classItem.description || 'No description provided'}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 pb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/create-session?class=${classItem.id}`)}
          className="flex items-center gap-1.5 border-brand-200 text-brand-700 hover:bg-brand-50"
        >
          <QrCode className="h-4 w-4" />
          Take Attendance
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/attendance-records?class=${classItem.id}`)}
          className="flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <ListChecks className="h-4 w-4" />
          View Records
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassCard;
