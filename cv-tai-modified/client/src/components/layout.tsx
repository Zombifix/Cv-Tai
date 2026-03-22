import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Library, WandSparkles, FileText, Clock, Settings, LogOut } from "lucide-react";

export function AppSidebar() {
  const [location] = useLocation();

  const items = [
    { title: "Super-CV Library", url: "/library", icon: Library },
    { title: "Tailor CV", url: "/tailor", icon: WandSparkles },
    { title: "History", url: "/history", icon: Clock },
  ];

  const bottomItems = [
    { title: "Parametres", url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar variant="inset" className="border-r border-border/50">
      <SidebarContent className="bg-sidebar flex flex-col">
        <div className="p-6">
          <Link href="/library">
            <div className="flex items-center gap-3 font-bold text-xl cursor-pointer text-foreground">
              <div className="bg-primary/10 text-primary p-2 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              CV Tailor
            </div>
          </Link>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
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

        {/* Bottom section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Deconnexion">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 cursor-pointer w-full">
                    <LogOut className="w-5 h-5" />
                    <span>Deconnexion</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="h-4" />
      </SidebarContent>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background/50">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 px-6 backdrop-blur-xl transition-all">
            <SidebarTrigger className="hover-elevate" />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent border-2 border-background shadow-sm" />
            </div>
          </header>
          <main className="flex-1 w-full p-4 md:p-8 lg:p-10 mx-auto max-w-7xl overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
