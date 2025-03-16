
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
}

export function useTeacherClasses(userId: string, preselectedClassId: string | null) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(false);
  const [selectedClassName, setSelectedClassName] = useState<string>('');

  // Fetch teacher's classes when component mounts
  useEffect(() => {
    const fetchClasses = async () => {
      if (!userId) return;
      
      try {
        setIsLoadingClasses(true);
        
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', userId);
        
        if (error) throw error;
        
        setClasses(data || []);
        
        // If we have a preselected class ID, set the class name as well
        if (preselectedClassId && data) {
          const selectedClass = data.find(c => c.id === preselectedClassId);
          if (selectedClass) {
            setSelectedClassName(selectedClass.name);
          }
        }
      } catch (error: any) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setIsLoadingClasses(false);
      }
    };
    
    fetchClasses();
  }, [userId, preselectedClassId]);

  return {
    classes,
    isLoadingClasses,
    selectedClassName
  };
}
