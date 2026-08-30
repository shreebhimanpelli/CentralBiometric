"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getStoredAuth,
  setStoredAuth,
  canViewStaffPunches,
  API_BASE,
  type User,
  type Role,
} from "@/lib/api";
import { FlameLogo } from "@/components/FlameLogo";
import { RoleBadge } from "@/components/ui/Badge";
import { Sidebar, buildNavItems } from "@/components/dashboard/Sidebar";
import { getSidebarCollapsed, setSidebarCollapsed } from "@/lib/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.replace("/");
      return;
    }
    setUser(auth.user);
    setCollapsed(getSidebarCollapsed());
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    setSidebarCollapsed(next);
  }

  async function handleLogout() {
    const auth = getStoredAuth();
    if (auth?.refreshToken) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      }).catch(() => {});
    }
    setStoredAuth(null);
    router.replace("/");
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="flame-text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  const role = user.role as Role;
  const navItems = buildNavItems(role, canViewStaffPunches(role));

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[var(--border)]">
        <div className="flame-gradient-bar w-full" />
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 min-h-[52px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <FlameLogo size="header" />
            <RoleBadge role={role} />
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flame-btn-secondary min-w-[2.75rem] px-3 shrink-0"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <Sidebar
        user={user}
        role={role}
        collapsed={collapsed}
        menuOpen={menuOpen}
        navItems={navItems}
        onCloseMobile={() => setMenuOpen(false)}
        onToggleCollapse={toggleCollapse}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-x-hidden bg-[var(--background)]">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
