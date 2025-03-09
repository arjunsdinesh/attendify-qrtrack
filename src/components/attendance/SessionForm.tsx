
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SessionFormProps {
  onStartSession: (className: string) => void;
  isLoading?: boolean;
}

export const SessionForm = ({ onStartSession, isLoading = false }: SessionFormProps) => {
  const [className, setClassName] = useState('');

  const handleSubmit = () => {
    if (!className.trim()) return;
    onStartSession(className);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="className">Class Name</Label>
        <Input 
          id="className" 
          placeholder="Enter class name"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />
      </div>
      <Button 
        onClick={handleSubmit}
        className="w-full"
        disabled={!className.trim() || isLoading}
      >
        {isLoading ? 'Creating...' : 'Start Session'}
      </Button>
    </div>
  );
};
