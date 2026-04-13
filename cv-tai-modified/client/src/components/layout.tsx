import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Library, WandSparkles, Clock, Settings, LogOut, AlignLeft, Menu, X } from "lucide-react";
import { useLogout, useCurrentUser } from "@/hooks/use-auth";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { title: "Super CV",   url: "/library",  icon: Library      },
  { title: "Tailoring",  url: "/tailor",   icon: WandSparkles },
  { title: "Historique", url: "/history",  icon: Clock        },
];

// ─── Single nav link ──────────────────────────────────────────────────────────

function NavItem({ title, url, icon: Icon, active }: {
  title: string;
  url: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link href={url}>
      <div
        className={[
          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none transition-colors duration-150",
          active
            ? "bg-primary text-white shadow-sm shadow-primary/30"
            : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1e293b]",
        ].join(" ")}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="text-sm font-medium leading-none">{title}</span>
      </div>
    </Link>
  );
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const logout = useLogout();

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 flex items-center justify-between">
        <Link href="/library">
          <div className="flex items-center gap-2 cursor-pointer">
            <AlignLeft className="w-5 h-5 text-primary" strokeWidth={2.5} />
            <span className="font-extrabold text-xl tracking-tight text-primary">dispatch.</span>
          </div>
        </Link>
        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="px-4 flex-1 min-h-0 overflow-y-auto">
        <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          Navigation
        </p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.url}
              {...item}
              active={location.startsWith(item.url)}
            />
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="px-4 pb-6 flex flex-col gap-1">
        <NavItem
          title="Parametres"
          url="/settings"
          icon={Settings}
          active={location.startsWith("/settings")}
        />
        <button
          onClick={() => logout.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-[#f43f5e] hover:bg-[#fff1f2] transition-colors duration-150 w-full"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          <span className="text-sm font-medium leading-none">Deconnexion</span>
        </button>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] flex-shrink-0 p-3 min-h-screen sticky top-0">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[240px] p-3">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-[#f1f5f9] px-5 md:px-6">
          {/* Mobile menu */}
          <button
            className="lg:hidden p-2 rounded-xl text-[#64748b] hover:bg-white transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          {/* User card */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-4 py-2 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex-shrink-0 overflow-hidden">
              <img
                src="https://api.dicebear.com/7.x/initials/svg?seed=TP&backgroundColor=4f46e5"
                alt="avatar"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-[#1e293b] leading-tight">
                {user?.email?.split("@")[0] ?? "Utilisateur"}
              </p>
              <p className="text-xs text-[#94a3b8]">Credit illimites</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full p-4 md:p-6 lg:p-8 max-w-6xl mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

// Keep AppSidebar export for any existing imports
export { Sidebar as AppSidebar };
