
import { WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'checking' | 'connected' | 'disconnected';
}

const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  if (status !== 'disconnected') {
    return null;
  }

  return (
    <div className="bg-red-50 p-3 rounded-t-lg border-b border-red-200">
      <div className="flex items-center text-red-700 text-sm">
        <WifiOff className="h-4 w-4 mr-2" />
        <span>Database connection error. Please check your Supabase configuration.</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
