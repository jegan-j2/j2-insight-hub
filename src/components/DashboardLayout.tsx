import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-background via-background to-secondary/10">
        {/* Header spans full width at the top */}
        <Navbar />
        {/* Sidebar + content below the header */}
        <div className="flex flex-1 min-h-0 w-full">
          <AppSidebar />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto" role="main">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
