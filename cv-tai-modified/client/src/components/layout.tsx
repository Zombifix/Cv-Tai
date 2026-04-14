import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock3, LogOut, Menu, Settings, WandSparkles, X } from "lucide-react";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";

type NavItemDef = {
  title: string;
  url: string;
  icon: React.ElementType<{ className?: string }>;
};

function DispatchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M6 4.4L17 4.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 10L17 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 15.6L17 15.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="3.2" cy="4.4" r="1.4" fill="currentColor" />
      <circle cx="3.2" cy="10" r="1.4" fill="currentColor" />
      <circle cx="3.2" cy="15.6" r="1.4" fill="currentColor" />
    </svg>
  );
}

function SuperCvIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3.2 3.5V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 5V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.8 7V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 9.6V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS: NavItemDef[] = [
  { title: "Super CV", url: "/library", icon: SuperCvIcon },
  { title: "Tailoring", url: "/tailor", icon: WandSparkles },
  { title: "Historique", url: "/history", icon: Clock3 },
  { title: "Parametres", url: "/settings", icon: Settings },
];

function NavItem({ item, active }: { item: NavItemDef; active: boolean }) {
  return (
    <Link href={item.url}>
      <div
        className={[
          "flex h-8 items-center gap-3 rounded-[12px] px-3 transition-colors duration-150",
          active
            ? "border border-white/60 bg-[#efefef] text-[#18181b] shadow-[0_2px_4px_-2px_rgba(100,103,242,0.2)]"
            : "text-[#65758b] hover:bg-[#efefef]",
        ].join(" ")}
      >
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
        <span className="text-[16px] font-normal leading-none">{item.title}</span>
      </div>
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const logout = useLogout();

  return (
    <div className="flex h-full w-full flex-col rounded-[40px] bg-[#f7f7f7] pb-6 pt-[33px] shadow-[inset_0_1px_0_rgba(255,255,255,0.96)]">
      <div className="relative flex items-center justify-center px-6">
        <Link href="/library">
          <div className="flex cursor-pointer items-center gap-[10px]">
            <img src="/logo-mark.svg" alt="" className="h-[16px] w-auto" />
            <img src="/logo-wordmark.svg" alt="dispatch." className="h-[28px] w-auto" />
          </div>
        </Link>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 rounded-lg p-1 text-[#627391] hover:bg-[#dfe4ec] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="mt-8 px-2">
        <div className="px-4 pb-2 pt-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#65758b]">Navigation</p>
        </div>
        <nav className="space-y-2 px-2">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.url}
              item={item}
              active={location === item.url || location.startsWith(`${item.url}/`) || (item.url === "/tailor" && location === "/")}
            />
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={() => logout.mutate()}
        className="mt-auto mx-2 flex h-10 items-center justify-center gap-3 rounded-[12px] text-[14px] font-normal text-[#65758b] transition-colors hover:bg-[#efefef]"
      >
        <LogOut className="h-5 w-5" />
        <span className="leading-none">Deconnexion</span>
      </button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const avatarSeed = useMemo(() => user?.email?.trim() || "Theo Pornin", [user?.email]);

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="hidden w-[288px] flex-shrink-0 p-4 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[288px] p-4">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center px-4 md:px-7 lg:px-8">
          <button
            type="button"
            className="rounded-xl p-2 text-[#65758b] hover:bg-[#e7edf5] lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center">
            <div className="flex items-center gap-3 rounded-[30px] bg-[#f7f7f7] px-4 py-2">
              <div className="h-[44px] w-[44px] flex-shrink-0 overflow-hidden rounded-full">
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=e5e7eb`}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div>
                <p className="text-[14px] font-semibold leading-tight tracking-[-0.35px] text-[#0f1729]">
                  {user?.email?.split("@")[0] || "Theo Pornin"}
                </p>
                <p className="text-[12px] tracking-[0.6px] text-[#65758b]">Crédit illimités</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-6 md:px-7 md:pb-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export { Sidebar as AppSidebar };
