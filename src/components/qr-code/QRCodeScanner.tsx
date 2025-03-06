
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { Scanner } from '@yudiel/react-qr-scanner';

const QRCodeScanner = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [recentlyMarked, setRecentlyMarked] = useState(false);

  // Handle successful QR code scan
  const handleScan = async (result: any) => {
    try {
      // Extract the data from the scanned QR code
      const data = result[0]?.rawValue || '';
      
      if (!user || processing || recentlyMarked) return;
      
      // Prevent multiple quick scans
      if (lastScanned === data) return;
      setLastScanned(data);
      
      setProcessing(true);
      
      // Parse the QR code data
      const qrData = JSON.parse(data);
      
      // Check if the QR code contains all required fields
      if (!qrData.sessionId || !qrData.timestamp || !qrData.signature) {
        throw new Error('Invalid QR code format');
      }
      
      // Check if the QR code is still valid (within 10 seconds)
      const now = Date.now();
      if (now - qrData.timestamp > 10000) {
        throw new Error('QR code has expired. Please scan a fresh code.');
      }
      
      // Check if the session is active
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('is_active')
        .eq('id', qrData.sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      if (!sessionData.is_active) {
        throw new Error('This attendance session is no longer active');
      }
      
      // Check if attendance was already marked for this session
      const { data: existingRecord, error: existingError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', qrData.sessionId)
        .eq('student_id', user.id)
        .maybeSingle();
      
      if (existingError) throw existingError;
      
      if (existingRecord) {
        setRecentlyMarked(true);
        setTimeout(() => setRecentlyMarked(false), 5000);
        toast.info('You have already marked your attendance for this session');
        return;
      }
      
      // Create attendance record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert([
          {
            session_id: qrData.sessionId,
            student_id: user.id,
            timestamp: new Date().toISOString(),
          }
        ]);
      
      if (insertError) throw insertError;
      
      // Mark as recently marked to prevent multiple submissions
      setRecentlyMarked(true);
      setTimeout(() => setRecentlyMarked(false), 5000);
      
      toast.success('Attendance marked successfully!');
      
      // Automatically stop scanning after successful scan
      setScanning(false);
      
    } catch (error: any) {
      console.error('Error processing QR code:', error);
      toast.error(error.message || 'Failed to process QR code');
    } finally {
      setProcessing(false);
    }
  };

  // Handle QR scanner errors
  const handleError = (error: any) => {
    console.error('QR scanner error:', error);
    toast.error('Failed to access camera. Please check permissions.');
    setScanning(false);
  };

  // Toggle scanning state
  const toggleScanner = () => {
    setScanning(prev => !prev);
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
        <CardDescription>
          {scanning 
            ? 'Scan the QR code shown by your teacher'
            : 'Start scanning to mark your attendance'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {scanning ? (
          <div className="w-full aspect-square rounded-lg overflow-hidden">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              scanDelay={500}
              captureOptions={{ facingMode: 'environment' }}
            />
            {processing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 w-full aspect-square bg-gray-100 rounded-lg">
            <div className="text-4xl text-muted-foreground mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 8v.5M15 12v.5M15 16v.5M9 8h1M9 12h1M9 16h1M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Z" />
              </svg>
            </div>
            <p className="text-center text-muted-foreground px-8">
              Click the button below to activate the camera and scan your attendance QR code.
            </p>
          </div>
        )}
        
        <Button 
          onClick={toggleScanner}
          className={`w-full ${scanning ? 'bg-destructive hover:bg-destructive/90' : 'bg-brand-500 hover:bg-brand-600'}`}
          disabled={processing || recentlyMarked}
        >
          {processing ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : recentlyMarked ? (
            'Attendance Marked ✓'
          ) : (
            scanning ? 'Cancel Scanning' : 'Start Scanning'
          )}
        </Button>
        
        {recentlyMarked && (
          <p className="text-sm text-teal-500 text-center">
            Your attendance has been successfully recorded.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;
