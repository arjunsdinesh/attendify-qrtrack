
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle>{classItem.name}</CardTitle>
        <CardDescription>Created on {formatDate(classItem.created_at)}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground">
          {classItem.description || 'No description provided'}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/create-session?class=${classItem.id}`)}
        >
          Take Attendance
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/attendance-records?class=${classItem.id}`)}
        >
          View Records
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassCard;
