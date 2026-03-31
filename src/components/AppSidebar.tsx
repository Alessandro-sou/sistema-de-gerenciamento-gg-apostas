import { LayoutDashboard, Users, DollarSign, LogOut, MessageSquare, Shield, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Mediadores", url: "/mediadores", icon: Users },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Mensagem", url: "/mensagem", icon: MessageSquare },
  { title: "Cargos", url: "/cargos", icon: Shield },
  { title: "Configurações", url: "/configuracoes", icon: Settings }, // Adicionado
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-3 px-4 py-6">
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">GGapostas</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-primary/15 text-primary font-semibold border-r-2 border-primary"
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto px-4 pb-6">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-destructive">
            <LogOut className="mr-2 h-5 w-5" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}