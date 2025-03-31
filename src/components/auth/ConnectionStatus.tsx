
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
  const [showStatus, setShowStatus] = useState(false);
  
  // Don't show status immediately to prevent UI flashing
  useEffect(() => {
    // Only show disconnected status after a short delay
    if (status === 'disconnected') {
      const timeoutId = setTimeout(() => {
        setShowStatus(true);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setShowStatus(status === 'checking');
    }
  }, [status]);
  
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

  // Return null for connected to prevent UI flashing
  if (status === 'connected' || (status !== 'disconnected' && !showStatus)) {
    return null;
  }
  
  if (status === 'checking' && showStatus) {
    return (
      <div className="bg-amber-50 p-2 rounded-t-lg border-b border-amber-200">
        <div className="flex items-center text-amber-700 text-sm">
          <span className="animate-pulse mr-2 transition-all">●</span>
          <span>Connecting to database...</span>
        </div>
      </div>
    );
  }

  if (status === 'disconnected' && showStatus) {
    return (
      <div className="bg-red-50 p-2 rounded-t-lg border-b border-red-200">
        <div className="flex items-center text-red-700 text-sm">
          <WifiOff className="h-4 w-4 mr-2" />
          <div className="flex-1">
            <p>Connection error. Please check your network.</p>
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 h-6 text-xs border-red-300 hover:bg-red-100"
                onClick={handleRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry {retryCount > 0 ? `(${retryCount})` : ''}
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
