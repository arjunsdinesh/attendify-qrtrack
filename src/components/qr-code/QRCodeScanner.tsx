
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui-components';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, X, CheckCircle2 } from 'lucide-react';

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
      
      console.log('Scanned QR data (raw):', data);
      
      // Parse the QR code data
      let qrData;
      try {
        qrData = JSON.parse(data);
        console.log('Parsed QR data:', qrData);
      } catch (e) {
        console.error('QR parse error:', e);
        throw new Error('Invalid QR code format');
      }
      
      // Check if the QR code contains the required fields
      if (!qrData.sessionId || !qrData.timestamp || !qrData.expiresAt) {
        console.error('QR missing fields:', qrData);
        throw new Error('Invalid QR code format');
      }
      
      // Check if the QR code has expired
      const now = Date.now();
      if (qrData.expiresAt && now > qrData.expiresAt) {
        throw new Error('QR code has expired. Please scan a fresh code.');
      }
      
      console.log('Checking session: ', qrData.sessionId);
      
      // Check if the session is active
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('is_active, id, class_id')
        .eq('id', qrData.sessionId)
        .maybeSingle();
      
      if (sessionError) {
        console.error('Session query error:', sessionError);
        throw sessionError;
      }
      
      if (!sessionData) {
        console.error('Session not found:', qrData.sessionId);
        throw new Error('Attendance session not found. Please scan a valid QR code.');
      }
      
      console.log('Session data found:', {
        id: sessionData.id,
        classId: sessionData.class_id,
        isActive: sessionData.is_active
      });
      
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
      
      console.log('Recording attendance for session:', qrData.sessionId);
      
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
      
      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      
      console.log('Attendance recorded successfully');
      
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
    <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg border border-gray-100">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-sky-50">
        <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
          <QrCode className="h-5 w-5 text-brand-600" />
          Mark Attendance
        </CardTitle>
        <CardDescription className="text-gray-600">
          {scanning 
            ? 'Scan the QR code shown by your teacher'
            : 'Start scanning to mark your attendance'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-5 p-6">
        {scanning ? (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-inner border border-gray-200">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              scanDelay={500}
              constraints={{ facingMode: 'environment' }}
            />
            {processing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl backdrop-blur-sm">
                <LoadingSpinner className="h-10 w-10 border-4" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 w-full aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-4xl text-brand-500 mb-4">
              <QrCode size={64} strokeWidth={1.5} />
            </div>
            <p className="text-center text-gray-600 px-8 max-w-xs">
              Click the button below to activate the camera and scan your attendance QR code.
            </p>
          </div>
        )}
        
        <Button 
          onClick={toggleScanner}
          className={`w-full py-6 text-base font-medium ${scanning ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'} rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1`}
          disabled={processing || recentlyMarked}
        >
          {processing ? (
            <LoadingSpinner className="h-5 w-5" />
          ) : recentlyMarked ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Attendance Marked
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {scanning ? (
                <>
                  <X className="h-5 w-5" />
                  Cancel Scanning
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  Start Scanning
                </>
              )}
            </span>
          )}
        </Button>
        
        {recentlyMarked && (
          <div className="bg-teal-50 text-teal-700 rounded-lg p-4 border border-teal-200 w-full text-center animate-fade-in">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-2" />
            <p className="text-sm font-medium">
              Your attendance has been successfully recorded.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;
