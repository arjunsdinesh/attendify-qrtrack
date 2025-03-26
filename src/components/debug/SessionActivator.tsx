
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui-components';
import { activateAttendanceSession, listRecentSessions } from '@/utils/sessionActivator';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

export const SessionActivator = () => {
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  
  const fetchSessions = async () => {
    setLoading(true);
    const recentSessions = await listRecentSessions();
    setSessions(recentSessions);
    setLoading(false);
  };
  
  const activateSession = async (sessionId: string) => {
    setActivating(true);
    await activateAttendanceSession(sessionId);
    await fetchSessions(); // Refresh the list
    setActivating(false);
  };
  
  const activateLatestSession = async () => {
    setActivating(true);
    await activateAttendanceSession();
    await fetchSessions(); // Refresh the list
    setActivating(false);
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="text-base flex justify-between items-center">
          <span>Session Status</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8" 
            onClick={fetchSessions}
            disabled={loading}
          >
            {loading ? <LoadingSpinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Button 
            onClick={activateLatestSession} 
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={activating}
          >
            {activating ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
            Activate Latest Session
          </Button>
          <p className="text-xs text-muted-foreground">
            This will activate the most recent attendance session in the database.
          </p>
        </div>
        
        {sessions.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Class</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t">
                    <td className="p-2">
                      {session.classes?.name || 'Unknown Class'}
                    </td>
                    <td className="p-2">
                      {session.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-200">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={session.is_active || activating}
                        onClick={() => activateSession(session.id)}
                      >
                        Activate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : (
          <p className="text-center py-4 text-muted-foreground">
            Click refresh to view recent sessions
          </p>
        )}
      </CardContent>
    </Card>
  );
};
