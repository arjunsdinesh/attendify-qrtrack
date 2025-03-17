
import { WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'checking' | 'connected' | 'disconnected';
}

const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  if (status === 'checking') {
    return (
      <div className="bg-amber-50 p-3 rounded-t-lg border-b border-amber-200">
        <div className="flex items-center text-amber-700 text-sm">
          <span className="animate-pulse mr-2">●</span>
          <span>Checking database connection...</span>
        </div>
      </div>
    );
  }
  
  if (status !== 'disconnected') {
    return null;
  }

  return (
    <div className="bg-red-50 p-3 rounded-t-lg border-b border-red-200">
      <div className="flex items-center text-red-700 text-sm">
        <WifiOff className="h-4 w-4 mr-2" />
        <div>
          <p>Database connection error. Please check your Supabase configuration.</p>
          <p className="text-xs mt-1">
            Try refreshing the page or check if Supabase is down.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
