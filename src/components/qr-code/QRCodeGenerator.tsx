import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRCodeGeneratorProps {
  sessionId: string;
  classId: string;
  className: string;
}

const QRCodeGenerator = ({ sessionId, classId, className }: QRCodeGeneratorProps) => {
  const { user } = useAuth();
  const [qrValue, setQrValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<boolean | null>(null);
  const [lastActivationTime, setLastActivationTime] = useState<number>(0);
  
  // Generate a cryptographically secure random secret
  const generateSecret = () => {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, x => x.toString(16)).join('');
  };

  // Enhanced session activation with robust error handling
  const forceActivateSession = useCallback(async () => {
    try {
      // Only try to activate if it's been more than 5 seconds since last activation
      // to prevent too many requests
      const now = Date.now();
      if (now - lastActivationTime < 5000) {
        console.log('Skipping activation, too soon since last attempt');
        return sessionStatus || false;
      }
      
      console.log('Force activating session:', sessionId);
      setGenerating(true);
      
      // Use update with RETURNING to get confirmation
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: true,
          end_time: null 
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
        
      if (error) {
        console.error('Error activating session:', error);
        setSessionStatus(false);
        setError('Failed to activate session');
        return false;
      }
      
      // Verify the update was successful
      if (!data || !data.is_active) {
        console.error('Session activation did not work, data returned:', data);
        setSessionStatus(false);
        setError('Failed to activate session - server did not confirm activation');
        return false;
      }
      
      console.log('Session activated successfully, confirmation:', data);
      setLastActivationTime(now);
      setSessionStatus(true);
      setError(null);
      return true;
      
    } catch (error) {
      console.error('Error in forceActivateSession:', error);
      setError('Failed to activate session');
      return false;
    } finally {
      setGenerating(false);
    }
  }, [sessionId, sessionStatus, lastActivationTime]);

  // Check session status with enhanced error handling
  const checkSessionStatus = useCallback(async () => {
    if (!sessionId) return false;
    
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('is_active')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error('Error checking session status:', error);
        setSessionStatus(null);
        // Try to activate anyway on error
        return forceActivateSession();
      }
      
      setSessionStatus(data?.is_active || false);
      console.log('Session active status:', data?.is_active);
      
      if (!data?.is_active) {
        // Try to activate it
        return forceActivateSession();
      }
      
      return data?.is_active || false;
    } catch (error) {
      console.error('Exception checking session status:', error);
      // Try to activate anyway on error
      return forceActivateSession();
    }
  }, [sessionId, forceActivateSession]);

  // Generate QR code with enhanced session activation
  const generateQRData = useCallback(async () => {
    // Prevent multiple simultaneous generation attempts
    if (refreshing) {
      console.log('Already refreshing QR, skipping this request');
      return;
    }
    
    try {
      if (!user) return;
      
      setRefreshing(true);
      setGenerating(true);
      setError(null);
      
      console.log('Generating QR code for session:', sessionId);
      
      // Force session activation before generating QR
      const isActive = await checkSessionStatus();
      
      if (!isActive) {
        console.warn('Could not verify session active status');
        const forcedActive = await forceActivateSession();
        if (!forcedActive) {
          throw new Error('Could not activate session');
        }
      }
      
      // Create the QR code data
      const timestamp = Date.now();
      const expiresAt = timestamp + (timeLeft * 1000);
      
      const qrData = {
        sessionId,
        timestamp,
        expiresAt,
        isActive: true,
        classId
      };
      
      console.log('QR data created:', {
        sessionId: qrData.sessionId,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt
      });
      
      setQrValue(JSON.stringify(qrData));
      setActive(true);
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
    } finally {
      setGenerating(false);
      setRefreshing(false);
    }
  }, [user, sessionId, classId, timeLeft, refreshing, checkSessionStatus, forceActivateSession]);

  // Start generating QR codes with enhanced activation
  const startQRGenerator = async () => {
    try {
      setActive(true);
      
      // Generate a new secret for this session
      const secret = generateSecret();
      
      // Update the session with the new secret and mark it as active
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ 
          qr_secret: secret, 
          is_active: true,
          end_time: null
        })
        .eq('id', sessionId)
        .select('is_active')
        .single();
      
      if (error) {
        console.error('Error starting attendance tracking:', error);
        throw error;
      }
      
      // Verify session is actually active
      if (!data || !data.is_active) {
        console.error('Session not activated despite update', data);
        // Try one more force activation
        await forceActivateSession();
      }
      
      // Generate the first QR code
      await generateQRData();
      
      toast.success('Attendance tracking started');
    } catch (error) {
      console.error('Error starting attendance tracking:', error);
      toast.error('Failed to start attendance tracking');
      setActive(false);
    }
  };

  // Stop generating QR codes
  const stopQRGenerator = async () => {
    try {
      setActive(false);
      
      // Update the session to mark it as inactive
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setSessionStatus(false);
      toast.success('Attendance tracking stopped');
    } catch (error) {
      console.error('Error stopping attendance tracking:', error);
      toast.error('Failed to stop attendance tracking');
    }
  };

  // Check if session is already active when component loads
  useEffect(() => {
    const initialSetup = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('is_active, qr_secret')
          .eq('id', sessionId)
          .single();
        
        if (error) {
          console.error('Error checking initial session status:', error);
          // Try to force activate on error
          await forceActivateSession();
        } else {
          setSessionStatus(data?.is_active || false);
          
          if (data?.is_active) {
            setActive(true);
          } else {
            // Try to activate anyway to ensure it's active
            await forceActivateSession();
          }
        }
        
        // Generate initial QR code regardless of status
        await generateQRData();
      } catch (error) {
        console.error('Error in initialSetup:', error);
      }
    };
    
    initialSetup();
  }, [sessionId, generateQRData, forceActivateSession]);

  // Set up more aggressive session keep-alive ping
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    
    if (active && sessionId) {
      // Set up a ping every 7 seconds to keep the session active
      pingInterval = setInterval(async () => {
        try {
          console.log('Sending session keep-alive ping');
          
          const { data, error } = await supabase
            .from('attendance_sessions')
            .update({ is_active: true, end_time: null })
            .eq('id', sessionId)
            .select('is_active')
            .single();
            
          if (error) {
            console.error('Error in session keep-alive:', error);
            // Try to force reactivate on error
            await forceActivateSession();
          } else if (data && data.is_active) {
            console.log('Session keep-alive successful, confirmed active');
            setSessionStatus(true);
            setError(null);
          } else {
            console.warn('Session keep-alive response indicates inactive session');
            await forceActivateSession();
          }
        } catch (error) {
          console.error('Exception in session keep-alive:', error);
          // Try to force reactivate on error
          await forceActivateSession();
        }
      }, 7000); // Every 7 seconds
    }
    
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [active, sessionId, forceActivateSession]);

  // Timer for QR code refresh with session verification
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (active) {
      // Generate initial QR code when activated if needed
      if (!qrValue) {
        generateQRData();
      }
      
      // Set up timer to count down from 5 seconds
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time to generate a new QR code with session verification
            checkSessionStatus().then(isActive => {
              if (!isActive) {
                // Try to reactivate if needed
                forceActivateSession().then(() => {
                  generateQRData();
                });
              } else {
                generateQRData();
              }
            });
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [active, generateQRData, qrValue, checkSessionStatus, forceActivateSession]);

  // Display a countdown animation ring around the QR code
  const progressPercentage = useMemo(() => {
    return (timeLeft / 5) * 100;
  }, [timeLeft]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Attendance QR Code</CardTitle>
        <CardDescription>
          {active 
            ? `For ${className}. Refreshes in ${timeLeft} seconds.`
            : 'Start tracking attendance for this session.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {error && (
          <Alert className="w-full border-red-200 bg-red-50 text-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {sessionStatus === false && !error && (
          <Alert className="w-full border-yellow-200 bg-yellow-50 text-yellow-800">
            <AlertDescription className="flex justify-between items-center">
              <span>Session is inactive. Activate to allow students to mark attendance.</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={startQRGenerator}
                disabled={generating}
              >
                Activate
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {active ? (
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full" 
              style={{
                background: `conic-gradient(#3b82f6 ${progressPercentage}%, transparent 0%)`,
                padding: '0.5rem'
              }}
            />
            <div className="bg-white rounded-xl p-2 relative z-10">
              {qrValue ? (
                <QRCode 
                  value={qrValue}
                  size={200}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
              ) : (
                <div className="h-[200px] w-[200px] flex items-center justify-center bg-gray-100">
                  <LoadingSpinner className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 p-8">
            <div className="text-4xl text-muted-foreground mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M7 7h.01" />
                <path d="M17 7h.01" />
                <path d="M7 17h.01" />
                <path d="M11 7h2" />
                <path d="M11 11h1" />
                <path d="M13 17h4" />
                <path d="M17 11h.01" />
                <path d="M11 17h.01" />
              </svg>
            </div>
            <p className="text-center text-muted-foreground">
              QR code will be generated and automatically refresh every 5 seconds when active.
            </p>
          </div>
        )}
        
        <Button 
          onClick={active ? stopQRGenerator : startQRGenerator}
          className={`w-full ${active ? 'bg-destructive hover:bg-destructive/90' : 'bg-brand-500 hover:bg-brand-600'}`}
          disabled={generating || refreshing}
        >
          {generating ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
          {active ? 'Stop Tracking' : 'Start Tracking'}
        </Button>
        
        {active && (
          <Button
            onClick={() => {
              setTimeLeft(5);
              // Force check session status before generating new QR
              checkSessionStatus().then(() => {
                generateQRData();
              });
            }}
            variant="outline"
            className="w-full"
            disabled={generating || refreshing}
          >
            {refreshing ? <LoadingSpinner className="h-4 w-4 mr-2" /> : null}
            Refresh QR Manually
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
