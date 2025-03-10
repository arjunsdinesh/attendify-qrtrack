
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui-components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionFormProps {
  classes: { id: string; name: string }[];
  isLoadingClasses: boolean;
  onStartSession: (classId: string, className: string) => void;
  isLoading?: boolean;
}

export const SessionForm = ({ 
  classes, 
  isLoadingClasses, 
  onStartSession, 
  isLoading = false 
}: SessionFormProps) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedClassId) return;
    
    // Find the class name for the selected ID
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;
    
    onStartSession(selectedClassId, selectedClass.name);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="classSelect">Select Class</Label>
        {isLoadingClasses ? (
          <div className="flex items-center space-x-2 py-2">
            <LoadingSpinner className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Loading classes...</span>
          </div>
        ) : classes.length > 0 ? (
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger id="classSelect">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-muted-foreground py-2">
            No classes found. Please create a class first.
          </div>
        )}
      </div>
      <Button 
        onClick={handleSubmit}
        className="w-full"
        disabled={!selectedClassId || isLoading || classes.length === 0}
      >
        {isLoading ? 'Creating...' : 'Start Session'}
      </Button>
    </div>
  );
};
