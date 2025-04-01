
import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui-components";
import { Button } from "@/components/ui/button";

// Eagerly load critical path components
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard"; 

// Lazily load non-critical components with enhanced error handling
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard")
  .catch(err => {
    console.error("Failed to load TeacherDashboard:", err);
    return { default: () => <div>Failed to load TeacherDashboard</div> };
  })
);
const ScanQR = lazy(() => import("./pages/ScanQR")
  .catch(err => {
    console.error("Failed to load ScanQR:", err);
    return { default: () => <div>Failed to load ScanQR</div> };
  })
);
const CreateSession = lazy(() => import("./pages/CreateSession")
  .catch(err => {
    console.error("Failed to load CreateSession:", err);
    return { default: () => <div>Failed to load CreateSession</div> };
  })
);
const Profile = lazy(() => import("./pages/Profile")
  .catch(err => {
    console.error("Failed to load Profile:", err);
    return { default: () => <div>Failed to load Profile</div> };
  })
);
const AttendanceHistory = lazy(() => import("./pages/AttendanceHistory")
  .catch(err => {
    console.error("Failed to load AttendanceHistory:", err);
    return { default: () => <div>Failed to load AttendanceHistory</div> };
  })
);
const AttendanceRecords = lazy(() => import("./pages/AttendanceRecords")
  .catch(err => {
    console.error("Failed to load AttendanceRecords:", err);
    return { default: () => <div>Failed to load AttendanceRecords</div> };
  })
);
const ManageClasses = lazy(() => import("./pages/ManageClasses")
  .catch(err => {
    console.error("Failed to load ManageClasses:", err);
    return { default: () => <div>Failed to load ManageClasses</div> };
  })
);

// Configure with optimized staleTime and reduced refetches for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component with immediate visibility
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

  static getDerivedStateFromError(): ErrorBoundaryState {
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

// App component with optimized loading
const App = () => {
  console.log("Rendering App component");
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <React.StrictMode>
            <Toaster />
            <Sonner />
            <ErrorBoundary fallback={<ErrorFallback />}>
              <Routes>
                <Route path="/" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <Index />
                  </React.Suspense>
                } />
                <Route path="/login" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <Index />
                  </React.Suspense>
                } />
                <Route path="/student-dashboard" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <StudentDashboard />
                  </React.Suspense>
                } />
                <Route path="/student" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <StudentDashboard />
                  </React.Suspense>
                } />
                <Route path="/teacher-dashboard" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <TeacherDashboard />
                  </React.Suspense>
                } />
                <Route path="/teacher" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <TeacherDashboard />
                  </React.Suspense>
                } />
                <Route path="/scan-qr" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <ScanQR />
                  </React.Suspense>
                } />
                <Route path="/create-session" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <CreateSession />
                  </React.Suspense>
                } />
                <Route path="/profile" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <Profile />
                  </React.Suspense>
                } />
                <Route path="/attendance-history" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <AttendanceHistory />
                  </React.Suspense>
                } />
                <Route path="/attendance-records" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <AttendanceRecords />
                  </React.Suspense>
                } />
                <Route path="/manage-classes" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <ManageClasses />
                  </React.Suspense>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </React.StrictMode>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

