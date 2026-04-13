import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock3, LogOut, Menu, Settings, WandSparkles, X } from "lucide-react";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";

type NavItemDef = {
  title: string;
  url: string;
  icon: (props: { className?: string }) => JSX.Element;
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
          "flex h-12 items-center gap-3 rounded-[14px] px-4 transition-colors duration-150",
          active ? "bg-[#2f63e2] text-white" : "text-[#627391] hover:bg-[#e6e9f0]",
        ].join(" ")}
      >
        <item.icon className="h-[20px] w-[20px] flex-shrink-0" />
        <span className="text-[14px] font-medium leading-none">{item.title}</span>
      </div>
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const logout = useLogout();

  return (
    <div className="flex h-full w-full flex-col rounded-[34px] bg-[#eceef2] px-6 pb-8 pt-8">
      <div className="flex items-center justify-between">
        <Link href="/library">
          <div className="flex cursor-pointer items-center gap-2 text-[#2f63e2]">
            <DispatchMark className="h-6 w-6" />
            <span className="text-[28px] font-extrabold leading-none tracking-[-0.02em]">dispatch.</span>
          </div>
        </Link>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#627391] hover:bg-[#dfe4ec] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="mt-[54px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#65758f]">Navigation</p>
        <nav className="mt-4 space-y-2">
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
        className="mt-auto flex h-11 items-center justify-center gap-3 rounded-xl text-[14px] font-medium text-[#e06492] transition-colors hover:bg-[#f8e6ee]"
      >
        <LogOut className="h-[18px] w-[18px]" />
        <span className="leading-none">Deconnexion</span>
      </button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = useMemo(() => {
    const localPart = user?.email?.split("@")[0]?.trim();
    if (!localPart) return "Theo Pornin";
    if (localPart.includes(".")) {
      return localPart
        .split(".")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }, [user?.email]);

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <aside className="hidden w-[276px] flex-shrink-0 p-5 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[276px] p-5">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[94px] items-start px-4 pt-5 md:px-7 lg:px-8">
          <button
            type="button"
            className="rounded-xl p-2 text-[#627391] hover:bg-[#e6e9f0] lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex h-[68px] items-center rounded-[34px] bg-[#eceef2] px-4 pr-7">
            <div className="h-[52px] w-[52px] overflow-hidden rounded-full bg-[#dfe4ec]">
              <img
                src="https://api.dicebear.com/7.x/initials/svg?seed=Theo%20Pornin&backgroundColor=e5e7eb"
                alt="avatar"
                className="h-full w-full object-cover"
                onError={(event) => {
                  (event.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="ml-3.5 leading-tight">
              <p className="text-[16px] font-bold text-[#111a30]">{userName}</p>
              <p className="mt-1 text-[13px] text-[#66758f]">Credit illimites</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-6 md:px-7 md:pb-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export { Sidebar as AppSidebar };
