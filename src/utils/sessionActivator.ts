
import { supabase } from './supabase';
import { toast } from 'sonner';

/**
 * Utility to activate a specific attendance session or the most recent one
 * @param sessionId Optional specific session ID to activate
 * @returns Promise resolving to boolean indicating success
 */
export const activateAttendanceSession = async (sessionId?: string): Promise<boolean> => {
  try {
    // If no specific session ID is provided, get the most recent session
    if (!sessionId) {
      console.log('No session ID provided, finding the most recent session');
      
      const { data: recentSessions, error: fetchError } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, classes(name)')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fetchError) {
        console.error('Error fetching recent session:', fetchError);
        toast.error('Error finding recent session');
        return false;
      }
      
      if (!recentSessions || recentSessions.length === 0) {
        console.error('No sessions found in database');
        toast.error('No sessions found to activate');
        return false;
      }
      
      sessionId = recentSessions[0].id;
      
      // Show class name if available
      let className = 'Unknown class';
      if (recentSessions[0].classes) {
        if (typeof recentSessions[0].classes === 'object' && recentSessions[0].classes !== null && 'name' in recentSessions[0].classes) {
          className = (recentSessions[0].classes as any).name;
        }
      }
      
      console.log(`Found most recent session: ${sessionId} (${className})`);
    }
    
    console.log('Activating session:', sessionId);
    
    // Update the session to be active
    const { data, error } = await supabase
      .from('attendance_sessions')
      .update({ 
        is_active: true, 
        end_time: null 
      })
      .eq('id', sessionId)
      .select('id, is_active')
      .single();
    
    if (error) {
      console.error('Error activating session:', error);
      toast.error('Failed to activate session');
      return false;
    }
    
    if (!data || !data.is_active) {
      console.error('Session was not activated properly:', data);
      toast.error('Session activation failed');
      return false;
    }
    
    console.log('Session activated successfully:', data);
    toast.success('Session activated successfully');
    
    return true;
  } catch (error) {
    console.error('Exception in activateAttendanceSession:', error);
    toast.error('An error occurred while activating the session');
    return false;
  }
};

/**
 * List recent attendance sessions with activation status
 * @returns Promise resolving to array of sessions
 */
export const listRecentSessions = async () => {
  try {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('id, is_active, created_at, class_id, classes(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching recent sessions:', error);
      toast.error('Failed to fetch recent sessions');
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in listRecentSessions:', error);
    return [];
  }
};
