
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui-components';

interface CreateClassDialogProps {
  onCreateClass: (className: string) => Promise<void>;
}

const CreateClassDialog = ({ onCreateClass }: CreateClassDialogProps) => {
  const [newClassName, setNewClassName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newClassName.trim()) return;
    
    setSubmitting(true);
    try {
      await onCreateClass(newClassName);
      setNewClassName('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Class</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="className">Class Name</Label>
          <Input
            id="className"
            placeholder="Enter class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={submitting || !newClassName.trim()}
        >
          {submitting ? <LoadingSpinner className="h-4 w-4" /> : 'Create Class'}
        </Button>
      </div>
    </DialogContent>
  );
};

export default CreateClassDialog;
