"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlameLogo } from "@/components/FlameLogo";
import { RoleBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Role, User } from "@/lib/api";
import { roleLabel } from "@/lib/api";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function NavLink({
  href,
  label,
  icon,
  collapsed,
  onNavigate,
}: NavItem & { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn("flame-sidebar-nav-link", active && "active", collapsed && "lg:justify-center lg:px-2")}
    >
      <span className="shrink-0 w-5 h-5 flex items-center justify-center opacity-90 flame-sidebar-nav-icon">{icon}</span>
      <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
    </Link>
  );
}

function CollapseButton({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn("flame-sidebar-toggle hidden lg:inline-flex", className)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <svg
        className={cn("w-4 h-4 transition-transform duration-200", collapsed && "rotate-180")}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  );
}

const icons = {
  overview: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h4v4H4V6zm6 0h10v4H10V6zM4 14h4v4H4v-4zm6 0h10v4H10v-4z" />
    </svg>
  ),
  punches: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  attendance: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  events: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  users: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

interface SidebarProps {
  user: User;
  role: Role;
  collapsed: boolean;
  menuOpen: boolean;
  navItems: NavItem[];
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

export function Sidebar({
  user,
  role,
  collapsed,
  menuOpen,
  navItems,
  onCloseMobile,
  onToggleCollapse,
  onLogout,
}: SidebarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          onClick={onCloseMobile}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          "flame-sidebar fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-dvh",
          "flex flex-col shadow-lg lg:shadow-none",
          "transition-[width,transform] duration-300 ease-in-out",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[15.5rem]",
          "w-[min(100%,15.5rem)]",
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flame-gradient-bar w-full shrink-0" />

        {/* Brand header */}
        <div className="shrink-0 border-b border-[var(--border)] px-3 py-4">
          {/* Desktop expanded */}
          <div className={cn("hidden lg:flex items-center gap-3", collapsed && "lg:hidden")}>
            <FlameLogo size="sidebar-compact" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-flame-blue leading-tight">Biometric</p>
              <RoleBadge role={role} className="mt-1.5" />
            </div>
            <CollapseButton collapsed={collapsed} onToggle={onToggleCollapse} />
          </div>

          {/* Desktop collapsed */}
          <div className={cn("hidden", collapsed && "lg:flex lg:flex-col lg:items-center lg:gap-3")}>
            <CollapseButton collapsed={collapsed} onToggle={onToggleCollapse} />
          </div>

          {/* Mobile drawer */}
          <div className="lg:hidden flex items-center gap-3">
            <FlameLogo size="sidebar-compact" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-flame-blue leading-tight">Biometric</p>
              <RoleBadge role={role} className="mt-1.5" />
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="flame-sidebar-toggle shrink-0"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className={cn("flame-sidebar-section-label", collapsed && "lg:hidden")}>Menu</p>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="shrink-0 px-3 pb-4">
          {collapsed ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <div
                className="flame-sidebar-avatar"
                title={`${user.name} (${roleLabel(role)})`}
              >
                {initials}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flame-sidebar-toggle w-full"
                title="Sign out"
                aria-label="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className={cn("flame-sidebar-user-card", collapsed && "lg:hidden")}>
              <div className="flex items-center gap-3">
                <div className="flame-sidebar-avatar">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-flame-blue truncate">{user.name}</p>
                  <p className="flame-text-small truncate mt-0.5">{user.userId}</p>
                </div>
              </div>
              {user.department && (
                <p className="flame-text-small truncate mt-2 pl-[3.25rem]">{user.department.name}</p>
              )}
              <button type="button" onClick={onLogout} className="flame-sidebar-signout">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function buildNavItems(role: Role, canViewStaffPunches: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: icons.overview },
  ];

  if (canViewStaffPunches) {
    items.push({ href: "/dashboard/punches", label: "Staff Attendance", icon: icons.punches });
  }
  if (role === "STAFF" || role === "STUDENT") {
    items.push({ href: "/dashboard/my-attendance", label: "My Attendance", icon: icons.attendance });
  }
  items.push({ href: "/dashboard/events", label: "Events", icon: icons.events });
  if (role === "ADMIN") {
    items.push({ href: "/dashboard/users", label: "Users", icon: icons.users });
  }

  return items;
}
