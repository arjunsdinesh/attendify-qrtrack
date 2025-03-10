
import ClassCard from './ClassCard';
import { EmptyState } from '@/components/ui-components';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import CreateClassDialog from './CreateClassDialog';

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
      <div className="text-center p-8 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">No Classes Yet</h3>
        <p className="text-muted-foreground mb-4">Create your first class to start tracking attendance.</p>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Class</Button>
          </DialogTrigger>
          <CreateClassDialog onCreateClass={onCreateClass} />
        </Dialog>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {classes.map((classItem) => (
        <ClassCard key={classItem.id} classItem={classItem} />
      ))}
    </div>
  );
};

export default ClassList;
