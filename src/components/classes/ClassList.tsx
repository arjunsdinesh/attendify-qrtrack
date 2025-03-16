
import ClassCard from './ClassCard';
import { EmptyState } from '@/components/ui-components';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import CreateClassDialog from './CreateClassDialog';
import { BookOpen, Plus } from 'lucide-react';

interface ClassListProps {
  classes: any[];
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  onCreateClass: (className: string) => Promise<void>;
}

const ClassList = ({ 
  classes, 
  createDialogOpen, 
  setCreateDialogOpen, 
  onCreateClass 
}: ClassListProps) => {
  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <EmptyState
          title="No Classes Yet"
          description="Create your first class to start tracking attendance"
          icon={<BookOpen className="h-12 w-12 text-gray-300" />}
          action={
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-2 bg-brand-600 hover:bg-brand-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Class
                </Button>
              </DialogTrigger>
              <CreateClassDialog onCreateClass={onCreateClass} />
            </Dialog>
          }
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {classes.map((classItem) => (
        <ClassCard key={classItem.id} classItem={classItem} />
      ))}
    </div>
  );
};

export default ClassList;
