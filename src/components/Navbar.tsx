import { Building2, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

const Navbar = () => {
  const navigate = useNavigate();
  const lastUpdated = new Date();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="text-foreground" />

        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
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
            >
              <User className="h-5 w-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card border-border z-[100]" align="end">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@j2group.com.au</p>
              </div>
            </DropdownMenuLabel>
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
