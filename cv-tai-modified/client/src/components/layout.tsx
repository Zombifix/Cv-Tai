import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Library, WandSparkles, FileText, Clock, Settings, LogOut } from "lucide-react";
import { useLogout } from "@/hooks/use-auth";

const navItems = [
  { title: "Super CV", url: "/library", icon: Library, description: "Ta bibliothèque" },
  { title: "Tailoring", url: "/tailor", icon: WandSparkles, description: "Générer un CV" },
  { title: "Historique", url: "/history", icon: Clock, description: "Runs passés" },
];

const bottomItems = [
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const logout = useLogout();

  return (
    <Sidebar variant="inset" className="border-r border-border/40">
      <SidebarContent className="bg-sidebar flex flex-col gap-0">
        {/* Logo */}
        <div className="px-5 py-6">
          <Link href="/library">
            <div className="group flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <div className="bg-primary/10 text-primary p-2.5 rounded-2xl transition-all duration-200 group-hover:bg-primary/15 group-hover:scale-105">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="font-bold text-base text-foreground leading-none">CV Tailor</div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5 tracking-wide">Intelligence CV</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-border/50 mb-3" />

        {/* Main nav */}
        <SidebarGroup className="px-3">
          <div className="section-label px-3 mb-3">Navigation</div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer w-full
                          ${isActive
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                          }`}
                        >
                          <item.icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} style={{ width: '18px', height: '18px' }} />
                          <div className="min-w-0">
                            <div className={`text-sm font-semibold leading-none ${isActive ? 'text-primary-foreground' : ''}`}>{item.title}</div>
                            <div className={`text-[10px] mt-0.5 leading-none ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{item.description}</div>
                          </div>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom nav */}
        <div className="mx-4 h-px bg-border/50 mb-3" />
        <SidebarGroup className="px-3 pb-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {bottomItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer w-full
                          ${isActive
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                          }`}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Logout */}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Déconnexion" onClick={() => logout.mutate()}>
                  <div className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-200 cursor-pointer w-full">
                    <LogOut className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                    <span className="text-sm font-medium">Déconnexion</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/40 bg-background/90 px-5 backdrop-blur-xl">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <div className="flex-1" />
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent border-2 border-background shadow-sm cursor-pointer hover:scale-105 transition-transform duration-150" />
          </header>

          {/* Page content */}
          <main className="flex-1 w-full p-5 md:p-8 lg:p-10 max-w-7xl mx-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
