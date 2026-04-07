import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Fixed header spans full width */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>
      {/* Sidebar + content below the fixed header */}
      <div className="flex w-full pt-16 min-h-screen">
        <AppSidebar />
        <main
          className="flex-1 min-w-0 overflow-auto"
          style={{ padding: isMobile ? 12 : 24 }}
          role="main"
          data-mobile={isMobile}
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
