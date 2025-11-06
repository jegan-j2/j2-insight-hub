import { LayoutDashboard, Users, Settings, ChevronDown, UserCog } from "lucide-react";
import { NavLink } from "react-router-dom";
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

        {/* Settings at Bottom */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
