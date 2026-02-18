import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DateFilterProvider } from "@/contexts/DateFilterContext";
import { BreakpointIndicator } from "@/components/BreakpointIndicator";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import ClientView from "./pages/ClientView";
import TeamPerformance from "./pages/TeamPerformance";
import SQLMeetings from "./pages/SQLMeetings";
import TodayActivity from "./pages/TodayActivity";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DateFilterProvider>
        <Toaster />
        <Sonner />
        <BreakpointIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div className="page-transition"><Index /></div>} />
            <Route path="/login" element={<div className="page-transition"><Login /></div>} />
            <Route path="/forgot-password" element={<div className="page-transition"><ForgotPassword /></div>} />
            <Route path="/reset-password" element={<div className="page-transition"><ResetPassword /></div>} />
            <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/overview" element={<ProtectedRoute><DashboardLayout><div className="page-transition"><Overview /></div></DashboardLayout></ProtectedRoute>} />
            <Route path="/today" element={<ProtectedRoute><DashboardLayout><div className="page-transition"><TodayActivity /></div></DashboardLayout></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><DashboardLayout><div className="page-transition"><TeamPerformance /></div></DashboardLayout></ProtectedRoute>} />
            <Route path="/sql-meetings" element={<ProtectedRoute><DashboardLayout><div className="page-transition"><SQLMeetings /></div></DashboardLayout></ProtectedRoute>} />
            <Route path="/client/:clientSlug" element={<ProtectedRoute><DashboardLayout><div className="page-transition"><ClientView /></div></DashboardLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><DashboardLayout><div className="page-transition"><Settings /></div></DashboardLayout></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<div className="page-transition"><NotFound /></div>} />
          </Routes>
        </BrowserRouter>
      </DateFilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
