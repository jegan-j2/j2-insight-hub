import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import j2Logo from "@/assets/j2-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

const Navbar = () => {
  const navigate = useNavigate();
  const lastUpdated = new Date();
  const { role } = useUserRole();
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => localStorage.getItem("companyLogoUrl"));

  useEffect(() => {
    // Try to fetch from branding bucket if not in localStorage
    const fetchLogo = async () => {
      const cached = localStorage.getItem("companyLogoUrl");
      if (cached) {
        setCompanyLogo(cached);
        return;
      }
      // Check branding bucket for company-logo files
      const { data } = await supabase.storage.from("branding").list("", { limit: 10 });
      if (data) {
        const logoFile = data.find(f => f.name.startsWith("company-logo"));
        if (logoFile) {
          const { data: urlData } = supabase.storage.from("branding").getPublicUrl(logoFile.name);
          const url = urlData.publicUrl;
          localStorage.setItem("companyLogoUrl", url);
          setCompanyLogo(url);
        }
      }
    };
    fetchLogo();

    // Listen for storage changes (when logo is updated in Settings)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "companyLogoUrl") {
        setCompanyLogo(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80" role="banner">
      <div className="flex h-16 items-center px-4 gap-2 sm:gap-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="text-foreground" aria-label="Toggle sidebar" />

        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="J2 Group" 
              className="h-10 w-auto max-w-[120px] object-contain"
              onError={() => setCompanyLogo(null)}
            />
          ) : (
            <img 
              src={j2Logo} 
              alt="J2 Group" 
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">J2 Group</h1>
            <p className="text-xs text-muted-foreground">Lead Generation Dashboard</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Last Updated */}
        <div className="hidden md:flex flex-col items-end mr-4">
          <p className="text-xs text-muted-foreground">Last Updated</p>
          <p className="text-xs font-medium text-foreground">
            {format(lastUpdated, "MMMM dd, yyyy, h:mm a")} AEDT
          </p>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full border-2 border-secondary hover:border-secondary/80 transition-colors"
              aria-label="User menu"
            >
              <User className="h-5 w-5 text-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card border-border z-[100]" align="end">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@j2group.com.au</p>
              </div>
            </DropdownMenuLabel>
            {role && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <div className="px-2 py-1.5">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                    {role === 'admin' && '👑 Admin'}
                    {role === 'manager' && '👔 Manager'}
                    {role === 'client' && '🏢 Client'}
                    {role === 'sdr' && '📞 SDR'}
                    {!['admin', 'manager', 'client', 'sdr'].includes(role) && role}
                  </span>
                </div>
              </>
            )}
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;
