import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  Settings,
  Warehouse,
  ShieldCheck,
  Truck,
  Menu,
  X,
  LogOut,
  Search,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPortalNotifications, getSessionProfile, type AppRole } from "@/lib/data";
import { supabase } from "@/lib/supabase/client";

export type PortalRole = "client" | "admin" | "warehouse" | "qc" | "delivery";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: Record<PortalRole, { title: string; items: NavItem[] }> = {
  client: {
    title: "Client Portal",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { to: "/dashboard#shipments", label: "My Shipments", icon: Package },
      { to: "/dashboard#invoices", label: "Invoices", icon: Receipt },
      { to: "/track", label: "Track", icon: Search },
    ],
  },
  admin: {
    title: "Admin Console",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard },
      { to: "/admin#shipments", label: "Shipments", icon: Package },
      { to: "/admin#clients", label: "Clients", icon: Users },
      { to: "/admin#invoices", label: "Invoices", icon: Receipt },
      { to: "/admin#users", label: "Team", icon: Users },
    ],
  },
  warehouse: {
    title: "Warehouse (CN)",
    items: [
      { to: "/warehouse", label: "Overview", icon: Warehouse },
      { to: "/warehouse#receive", label: "Receive", icon: Package },
      { to: "/warehouse#consolidate", label: "Consolidate", icon: Package },
    ],
  },
  qc: {
    title: "Quality Control",
    items: [{ to: "/qc", label: "Inspection Queue", icon: ShieldCheck }],
  },
  delivery: {
    title: "Delivery Agent",
    items: [{ to: "/delivery", label: "My Deliveries", icon: Truck }],
  },
};

const ROLE_SWITCH: { role: PortalRole; to: string; label: string }[] = [
  { role: "client", to: "/dashboard", label: "Client" },
  { role: "admin", to: "/admin", label: "Admin" },
  { role: "warehouse", to: "/warehouse", label: "Warehouse" },
  { role: "qc", to: "/qc", label: "QC" },
  { role: "delivery", to: "/delivery", label: "Delivery" },
];

const ROLE_ACCESS: Record<PortalRole, AppRole[]> = {
  client: ["client"],
  admin: ["admin"],
  warehouse: ["admin", "staff_warehouse_cn"],
  qc: ["admin", "staff_qc"],
  delivery: ["admin", "staff_delivery"],
};

export function PortalShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: PortalRole;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useQuery({ queryKey: ["session-profile"], queryFn: getSessionProfile });
  const { data: notificationData } = useQuery({
    queryKey: ["portal-notifications", role],
    queryFn: () => getPortalNotifications(role),
    enabled: Boolean(profile?.user),
    refetchInterval: 30000,
  });
  const nav = NAV[role];
  const roles = profile?.roles ?? [];
  const portals = ROLE_SWITCH.filter((item) =>
    ROLE_ACCESS[item.role].some((allowedRole) => roles.includes(allowedRole)),
  );
  const displayName = profile?.client?.name ?? profile?.user?.email ?? "Signed in user";
  const displayEmail = profile?.user?.email ?? profile?.client?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const notifications = notificationData ?? [];

  useEffect(() => {
    if (!notificationsOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [notificationsOpen]);

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-surface text-navy">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-navy/5 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-navy/5 px-5">
          <img
            src="https://9q2eejtmhi.ufs.sh/f/d8EdUjADIce9Q1BoILwrQF0SXWVDEYMIpjnctyT1kBl8z3He"
            alt="Logo"
            className="h-8 w-25"
          />
        </div>

        <div className="p-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-navy/40">
            {nav.title}
          </p>
          <nav className="space-y-1">
            {nav.items.map((item) => {
              const active = pathname === item.to.split("#")[0];
              const Icon = item.icon;
              return (
                <a
                  key={item.to + item.label}
                  href={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand text-white"
                      : "text-navy/70 hover:bg-surface hover:text-navy",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <p className="mt-6 mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-navy/40">
            Available portals
          </p>
          <div className="grid grid-cols-2 gap-1">
            {portals.map((r) => (
              <Link
                key={r.role}
                to={r.to}
                className={cn(
                  "rounded-md px-2 py-1.5 text-center text-xs font-semibold ring-1 ring-inset transition-colors",
                  r.role === role
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-navy/60 ring-navy/10 hover:text-navy",
                )}
              >
                {r.label}
              </Link>
            ))}
            {portals.length === 0 && (
              <Link
                to="/auth"
                className="col-span-2 rounded-md bg-surface px-2 py-2 text-center text-xs font-semibold text-navy/60"
              >
                Sign in to view portals
              </Link>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-navy/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {initials || "VC"}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-navy">{displayName}</p>
              <p className="text-xs text-navy/50">{displayEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="text-navy/40 hover:text-navy"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-navy/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-navy/5 bg-white/80 px-6 backdrop-blur">
          <button className="lg:hidden text-navy" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-navy/50">{subtitle}</p>}
          </div>
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => setNotificationsOpen((value) => !value)}
              className="relative rounded-full p-2 text-navy/60 hover:bg-surface"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-xl">
                <div className="border-b border-navy/5 p-4">
                  <p className="text-sm font-bold text-navy">Notifications</p>
                  <p className="text-xs text-navy/45">Operational updates for this portal</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      to={item.to}
                      className="block rounded-xl p-3 hover:bg-surface"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <p className="text-sm font-semibold text-navy">{item.title}</p>
                      <p className="mt-1 text-xs text-navy/50">{item.body}</p>
                    </Link>
                  ))}
                  {notifications.length === 0 && (
                    <p className="p-6 text-center text-sm text-navy/50">No new notifications.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* <Link
            to="/"
            className="rounded-full p-2 text-navy/60 hover:bg-surface"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link> */}
          {actions}
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "brand" | "green" | "orange" | "red";
}) {
  const bar =
    accent === "green"
      ? "bg-accent-green"
      : accent === "orange"
        ? "bg-accent-orange"
        : accent === "red"
          ? "bg-accent-red"
          : "bg-brand";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy/5 bg-white p-5 shadow-sm">
      <span className={cn("absolute left-0 top-0 h-full w-1", bar)} />
      <p className="text-xs font-medium uppercase tracking-wider text-navy/50">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy/50">{hint}</p>}
    </div>
  );
}
