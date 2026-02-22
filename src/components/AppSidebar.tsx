import { LayoutDashboard, Users, Settings, ChevronDown, UserCog, LogOut, Activity, MonitorDot, Sun, Moon } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClientItem {
  name: string;
  slug: string;
}

export function AppSidebar() {
  const { open } = useSidebar();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClientId, setUserClientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoleAndClients = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, client_id")
          .eq("user_id", session.user.id)
          .single();
        if (roleData) {
          setUserRole(roleData.role);
          setUserClientId(roleData.client_id);
        }
      }

      const { data, error } = await supabase
        .from("clients")
        .select("client_id, client_name")
        .eq("status", "active")
        .order("client_name");

      if (!error && data) {
        setClients(data.map((c) => ({ name: c.client_name, slug: c.client_id })));
      }
    };
    fetchRoleAndClients();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
        duration: 2000,
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border" aria-label="Main navigation">
      <SidebarContent className="bg-card">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Overview - admin only */}
              {userRole !== "client" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/overview"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150 border-l-2 border-transparent bg-transparent shadow-none"
                    }
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}


              {/* Activity Monitor - admin only */}
              {userRole !== "client" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/activity-monitor"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150 border-l-2 border-transparent bg-transparent shadow-none"
                    }
                  >
                    <MonitorDot className="h-4 w-4" />
                    <span>Activity Monitor</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {/* Team Performance - admin only */}
              {userRole !== "client" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/team"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150 border-l-2 border-transparent bg-transparent shadow-none"
                    }
                  >
                    <UserCog className="h-4 w-4" />
                    <span>Team Performance</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {/* Clients Dropdown */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  {userRole !== "client" && (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-foreground hover:bg-muted/50 transition-all duration-150">
                      <Users className="h-4 w-4" />
                      <span>Clients</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  )}
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {(userRole === "client" ? clients.filter(c => c.slug === userClientId) : clients).map((client) => (
                        <SidebarMenuSubItem key={client.slug}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={`/client/${client.slug}`}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 border-l-2 border-transparent bg-transparent shadow-none"
                              }
                            >
                              <span>{client.name}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings & Logout at Bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {userRole !== "client" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150 border-l-2 border-transparent bg-transparent shadow-none"
                    }
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
               )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleTheme}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  <span>{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
