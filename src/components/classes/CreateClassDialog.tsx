
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui-components';
import { BookOpen } from 'lucide-react';

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
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="text-center pb-2">
        <div className="mx-auto bg-brand-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
          <BookOpen className="h-6 w-6 text-brand-700" />
        </div>
        <DialogTitle className="text-xl text-gray-800">Create New Class</DialogTitle>
        <DialogDescription className="text-gray-600">
          Enter a name for your new class to begin tracking attendance
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 py-6">
        <div className="space-y-2">
          <Label htmlFor="className" className="text-gray-700">Class Name</Label>
          <Input
            id="className"
            placeholder="Enter class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="h-12 border-gray-300 focus:border-brand-300"
          />
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full h-12 bg-brand-600 hover:bg-brand-700 font-medium"
          disabled={submitting || !newClassName.trim()}
        >
          {submitting ? (
            <LoadingSpinner className="h-5 w-5" />
          ) : (
            'Create Class'
          )}
        </Button>
      </div>
    </DialogContent>
  );
};

export default CreateClassDialog;
