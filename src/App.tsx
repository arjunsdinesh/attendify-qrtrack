
import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui-components";
import { Button } from "@/components/ui/button"; // Import Button for the ErrorFallback component

// Eagerly load critical path components
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard"; // Changed from lazy to direct import

// Lazily load non-critical components
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const CreateSession = lazy(() => import("./pages/CreateSession"));
const Profile = lazy(() => import("./pages/Profile"));
const AttendanceHistory = lazy(() => import("./pages/AttendanceHistory"));
const AttendanceRecords = lazy(() => import("./pages/AttendanceRecords"));
const ManageClasses = lazy(() => import("./pages/ManageClasses"));

// Configure with larger staleTime to reduce refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner className="h-8 w-8" />
  </div>
);

// Error fallback component
const ErrorFallback = () => (
  <div className="min-h-screen flex items-center justify-center flex-col">
    <div className="text-red-500 mb-4">Failed to load the page</div>
    <Button onClick={() => window.location.reload()}>
      Try Again
    </Button>
  </div>
);

// Define correct props interface for the ErrorBoundary component
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error boundary component with proper TypeScript types
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Component Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Dynamic import with error boundary
const withErrorBoundary = (Component: React.ComponentType) => () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Component />
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Index />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="*" element={
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher" element={<TeacherDashboard />} />
                  <Route path="/scan-qr" element={<ScanQR />} />
                  <Route path="/create-session" element={<CreateSession />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/attendance-history" element={<AttendanceHistory />} />
                  <Route path="/attendance-records" element={<AttendanceRecords />} />
                  <Route path="/manage-classes" element={<ManageClasses />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
