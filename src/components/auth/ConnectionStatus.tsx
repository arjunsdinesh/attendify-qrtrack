
import { WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  status: 'checking' | 'connected' | 'disconnected';
  onRetry?: () => void;
}

const ConnectionStatus = ({ status, onRetry }: ConnectionStatusProps) => {
  const [retryAttempted, setRetryAttempted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Reset retry status when connection status changes
  useEffect(() => {
    if (status === 'checking') {
      setRetryAttempted(false);
    }
  }, [status]);
  
  const handleRetry = () => {
    setRetryAttempted(true);
    setRetryCount(prev => prev + 1);
    if (onRetry) {
      onRetry();
    }
  };
  
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
  
  if (status === 'connected') {
    return (
      <div className="bg-green-50 p-3 rounded-t-lg border-b border-green-200">
        <div className="flex items-center text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span>Database connected successfully</span>
        </div>
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className="bg-red-50 p-3 rounded-t-lg border-b border-red-200">
        <div className="flex items-center text-red-700 text-sm">
          <WifiOff className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <p>Database connection error. Please check your Supabase configuration.</p>
            <p className="text-xs mt-1 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>
                {retryCount > 2 ? 
                  "Multiple connection attempts failed. The database may be unavailable." :
                  retryAttempted ? 
                    "Connection still failed. Try again or check if Supabase is down." :
                    "Try using the retry button or check your network connection."}
              </span>
            </p>
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 h-7 text-xs border-red-300 hover:bg-red-100"
                onClick={handleRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Connection {retryCount > 0 ? `(${retryCount})` : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;
