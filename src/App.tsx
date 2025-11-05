import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DateFilterProvider } from "@/contexts/DateFilterContext";
import { BreakpointIndicator } from "@/components/BreakpointIndicator";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import ClientView from "./pages/ClientView";
import TeamPerformance from "./pages/TeamPerformance";
import SQLMeetings from "./pages/SQLMeetings";
import Settings from "./pages/Settings";
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
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
            
            {/* Dashboard Routes with Layout */}
            <Route path="/overview" element={<DashboardLayout><Overview /></DashboardLayout>} />
            <Route path="/team" element={<DashboardLayout><TeamPerformance /></DashboardLayout>} />
            <Route path="/sql-meetings" element={<DashboardLayout><SQLMeetings /></DashboardLayout>} />
            <Route path="/client/:clientSlug" element={<DashboardLayout><ClientView /></DashboardLayout>} />
            <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DateFilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
