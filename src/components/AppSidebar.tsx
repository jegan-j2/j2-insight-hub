import { LayoutDashboard, Users, Settings, ChevronDown, UserCog, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
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

const clients = [
  { name: "Inxpress", slug: "inxpress" },
  { name: "Congero", slug: "congero" },
  { name: "TechCorp Solutions", slug: "techcorp" },
  { name: "Global Logistics", slug: "global-logistics" },
  { name: "FinServe Group", slug: "finserve" },
  { name: "HealthCare Plus", slug: "healthcare-plus" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();

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
              {/* Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/overview"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150"
                    }
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Team Performance */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/team"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150"
                    }
                  >
                    <UserCog className="h-4 w-4" />
                    <span>Team Performance</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Clients Dropdown */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="text-foreground hover:bg-muted/50 transition-all duration-150">
                      <Users className="h-4 w-4" />
                      <span>Clients</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {clients.map((client) => (
                        <SidebarMenuSubItem key={client.slug}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={`/client/${client.slug}`}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-secondary/20 text-secondary font-medium border-l-2 border-secondary"
                        : "text-foreground hover:bg-muted/50 transition-all duration-150"
                    }
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </NavLink>
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
