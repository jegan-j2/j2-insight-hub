import { LayoutDashboard, Users, Settings, ChevronDown, UserCog, LogOut, MonitorDot, Sun, Moon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientItem {
  name: string;
  slug: string;
  logo_url: string | null;
}

export function AppSidebar() {
  const { open } = useSidebar();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClientId, setUserClientId] = useState<string | null>(null);
  const [clientsPopoverOpen, setClientsPopoverOpen] = useState(false);

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
        .select("client_id, client_name, logo_url")
        .eq("status", "active")
        .order("client_name");

      if (!error && data) {
        setClients(data.map((c) => ({ name: c.client_name, slug: c.client_id, logo_url: c.logo_url })));
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

  const activeClass = "bg-sidebar-accent text-sidebar-primary font-medium";
  const inactiveClass = "text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150 bg-transparent shadow-none";

  const filteredClients = userRole === "client" ? clients.filter(c => c.slug === userClientId) : clients;

  return (
    <Sidebar collapsible="icon" className="border-r border-border top-16 h-[calc(100svh-4rem)]" aria-label="Main navigation">
      <SidebarContent className="bg-card">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Overview - admin only */}
              {userRole !== "client" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Overview">
                    <NavLink
                      to="/overview"
                      className={({ isActive }) => isActive ? activeClass : inactiveClass}
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
                  <SidebarMenuButton asChild tooltip="Activity Monitor">
                    <NavLink
                      to="/activity-monitor"
                      className={({ isActive }) => isActive ? activeClass : inactiveClass}
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
                  <SidebarMenuButton asChild tooltip="Team Performance">
                    <NavLink
                      to="/team"
                      className={({ isActive }) => isActive ? activeClass : inactiveClass}
                    >
                      <UserCog className="h-4 w-4" />
                      <span>Team Performance</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Clients - collapsed: popover, expanded: collapsible */}
              <SidebarMenuItem>
                {open ? (
                  /* Expanded mode: collapsible list */
                  <Collapsible defaultOpen className="group/collapsible">
                    {userRole !== "client" && (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={inactiveClass}>
                          <Users className="h-4 w-4" />
                          <span>Clients</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    )}
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {filteredClients.map((client) => (
                          <SidebarMenuSubItem key={client.slug}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={`/client/${client.slug}`}
                                className={({ isActive }) => isActive ? activeClass : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-all duration-150 bg-transparent shadow-none"}
                              >
                                <Avatar className="h-5 w-5 mr-1.5">
                                  <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                                  <AvatarFallback className="text-[10px] bg-muted">{client.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{client.name}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  /* Collapsed mode: stacked client logos + popover flyout */
                  <Popover open={clientsPopoverOpen} onOpenChange={setClientsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton tooltip="Clients" className={inactiveClass}>
                        {/* Stacked preview of first 3 client logos */}
                        <div className="relative flex items-center justify-center w-4 h-4">
                          {filteredClients.slice(0, 3).map((client, i) => (
                            <Avatar
                              key={client.slug}
                              className="absolute h-3.5 w-3.5 border border-card"
                              style={{
                                left: `${i * 3}px`,
                                top: `${i * 2 - 2}px`,
                                zIndex: 3 - i,
                              }}
                            >
                              <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                              <AvatarFallback className="text-[6px] bg-muted">{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {filteredClients.length === 0 && <Users className="h-4 w-4" />}
                        </div>
                        <span>Clients</span>
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-56 p-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Clients</p>
                      <ScrollArea className="max-h-64">
                        {filteredClients.map((client) => (
                          <button
                            key={client.slug}
                            onClick={() => {
                              navigate(`/client/${client.slug}`);
                              setClientsPopoverOpen(false);
                            }}
                            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-sidebar-accent/50 transition-colors"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                              <AvatarFallback className="text-[10px] bg-muted">{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{client.name}</span>
                          </button>
                        ))}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings & Logout at Bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {userRole !== "client" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings">
                    <NavLink
                      to="/settings"
                      className={({ isActive }) => isActive ? activeClass : inactiveClass}
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
                  tooltip={resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
                  className={inactiveClass}
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
                  tooltip="Logout"
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
