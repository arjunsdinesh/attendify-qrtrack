
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ScanQR from "./pages/ScanQR";
import CreateSession from "./pages/CreateSession";
import Profile from "./pages/Profile";
import AttendanceHistory from "./pages/AttendanceHistory";
import AttendanceRecords from "./pages/AttendanceRecords";
import ManageClasses from "./pages/ManageClasses";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/scan-qr" element={<ScanQR />} />
          <Route path="/create-session" element={<CreateSession />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance-history" element={<AttendanceHistory />} />
          <Route path="/attendance-records" element={<AttendanceRecords />} />
          <Route path="/manage-classes" element={<ManageClasses />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
