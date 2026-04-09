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

/*
  Sidebar — Linear-grade
  ──────────────────────
  Clean surface, no borders, shadow for depth.
  Active item: accent bg, full width.
  No sub-descriptions — just icon + label.
  Compact spacing, easy to scan.
*/
const navItems = [
  { title: "Super CV",   url: "/library",  icon: Library },
  { title: "Tailoring",  url: "/tailor",   icon: WandSparkles },
  { title: "Historique", url: "/history",  icon: Clock },
];

const bottomItems = [
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const logout = useLogout();

  return (
    <Sidebar variant="inset" className="border-none">
      <SidebarContent className="bg-sidebar flex flex-col gap-0 shadow-[1px_0_0_0_hsl(38,14%,90%)]">

        {/* Logo */}
        <div className="px-4 pt-5 pb-4">
          <Link href="/library">
            <div className="group flex items-center gap-2.5 cursor-pointer">
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C97B30 0%, #E8A840 100%)" }}
              >
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-[0.9375rem] text-foreground tracking-[-0.01em]">CV Tailor</span>
            </div>
          </Link>
        </div>

        {/* Main nav */}
        <SidebarGroup className="px-2 pt-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <div className={[
                          "flex items-center gap-2.5 px-3 py-2 rounded-[8px] cursor-pointer w-full",
                          "text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                        ].join(" ")}>
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="flex-1" />

        {/* Bottom nav */}
        <SidebarGroup className="px-2 pb-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {bottomItems.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <div className={[
                          "flex items-center gap-2.5 px-3 py-2 rounded-[8px] cursor-pointer w-full",
                          "text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                        ].join(" ")}>
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Logout */}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Déconnexion" onClick={() => logout.mutate()}>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] cursor-pointer w-full text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-150">
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Déconnexion</span>
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
    "--sidebar-width": "15rem",       /* 240px — compact, Linear-grade */
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full min-w-0">

          {/* Topbar — minimal, sticky */}
          <header className="sticky top-0 z-40 flex h-12 items-center gap-3 px-5 bg-background/95 backdrop-blur-sm" style={{ boxShadow: "0 1px 0 0 hsl(38 14% 88%)" }}>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors w-8 h-8 rounded-[8px] hover:bg-muted" />
            <div className="flex-1" />
            {/* User avatar */}
            <button
              className="w-7 h-7 rounded-full flex-shrink-0 transition-transform duration-150 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C97B30 0%, #E8A840 100%)" }}
            />
          </header>

          {/* Page content */}
          <main className="flex-1 w-full px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto overflow-x-hidden">
            {children}
          </main>

        </div>
      </div>
    </SidebarProvider>
  );
}
