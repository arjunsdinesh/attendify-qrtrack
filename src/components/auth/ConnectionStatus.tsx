
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
  
  // Always assume connected initially to prevent loading screens
  useEffect(() => {
    // Never show checking status
    if (status === 'checking') {
      setShowStatus(false);
      return;
    } 
    
    // Only show disconnected after multiple retries and a significant delay
    if (status === 'disconnected') {
      // Only show after multiple retries to prevent flickering
      if (retryCount > 3) {
        const timer = setTimeout(() => {
          setShowStatus(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowStatus(false); // Hide when connected
    }
  }, [status, retryCount]);
  
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

  // Always assume connected for better UX
  if (status === 'checking' || !showStatus) {
    return null;
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
