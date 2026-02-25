import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
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

const LOGO_DARK = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";
const LOGO_LIGHT = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png";

const Navbar = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { resolvedTheme } = useTheme();

  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userInitials, setUserInitials] = useState<string>('?')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        const { data: member } = await supabase
          .from('team_members')
          .select('sdr_name, profile_photo_url')
          .eq('email', user.email)
          .single()
        if (member?.sdr_name) {
          setUserName(member.sdr_name)
          const parts = member.sdr_name.split(' ')
          setUserInitials(
            parts.length >= 2 
              ? parts[0][0] + parts[parts.length-1][0] 
              : parts[0][0]
          )
        } else {
          setUserName(user.email.split('@')[0])
          setUserInitials(user.email[0].toUpperCase())
        }
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    const fetchLastUpdated = async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('activity_date')
        .order('activity_date', { ascending: false })
        .limit(1)
        .single()
      
      if (data?.activity_date) {
        setLastUpdated(new Date(data.activity_date))
      }
    }
    fetchLastUpdated()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80" role="banner">
      <div className="flex h-16 items-center px-4 gap-2 sm:gap-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="text-foreground" aria-label="Toggle sidebar" />

        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <img 
            src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT} 
            alt="J2 Group" 
            className="w-14 h-14 rounded-full object-contain"
          />
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
            {lastUpdated 
              ? format(lastUpdated, "MMMM dd, yyyy, h:mm a") + ' AEDT'
              : '—'
            }
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
              <span className="text-sm font-bold text-foreground">{userInitials}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card border-border z-[100]" align="end">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName || userEmail}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
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
