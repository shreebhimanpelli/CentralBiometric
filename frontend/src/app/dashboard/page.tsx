"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredAuth, roleLabel, type Role } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";

interface Stats {
  staffCount?: number;
  studentCount?: number;
  eventCount?: number;
  todayPunches?: number;
  myEvents?: number;
  activeEvents?: number;
  myAttendance?: number;
  upcomingEvents?: number;
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const user = getStoredAuth()?.user;
  const role = user?.role as Role;

  useEffect(() => {
    apiFetch<Stats>("/api/dashboard/stats")
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardPage
      title={`Welcome, ${user?.name?.split(" ")[0] ?? "User"}`}
      description={`${role ? roleLabel(role) : ""} dashboard`}
      loading={loading}
      loadingMessage="Loading dashboard..."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(role === "ADMIN" || role === "HOD") && (
          <>
            <StatCard label="Staff Members" value={stats.staffCount ?? 0} accent="blue" />
            <StatCard label="Students" value={stats.studentCount ?? 0} accent="gold" />
            <StatCard label="Events" value={stats.eventCount ?? 0} accent="orange" />
            <StatCard label="Today's Punches" value={stats.todayPunches ?? 0} accent="green" />
          </>
        )}
        {role === "EVENT_COORDINATOR" && (
          <>
            <StatCard label="My Events" value={stats.myEvents ?? 0} accent="blue" />
            <StatCard label="Active Events" value={stats.activeEvents ?? 0} accent="green" />
          </>
        )}
        {role === "STAFF" && (
          <StatCard label="Today's Punches" value={stats.todayPunches ?? 0} accent="green" />
        )}
        {role === "STUDENT" && (
          <>
            <StatCard label="Event Attendance" value={stats.myAttendance ?? 0} accent="blue" />
            <StatCard label="Upcoming Events" value={stats.upcomingEvents ?? 0} accent="gold" />
          </>
        )}
      </div>

      <ContentPanel title="Quick Guide">
        <ul className="flame-text-muted space-y-2.5">
          {role === "ADMIN" && (
            <>
              <li>View all staff attendance punches across the system</li>
              <li>Manage events and monitor student event attendance</li>
              <li>Browse all registered users</li>
            </>
          )}
          {role === "HOD" && (
            <>
              <li>View staff attendance for your department</li>
              <li>Monitor department events and student attendance (read-only)</li>
            </>
          )}
          {role === "EVENT_COORDINATOR" && (
            <>
              <li>Create and manage assigned events</li>
              <li>Record and view student event attendance</li>
            </>
          )}
          {role === "STAFF" && <li>View your own biometric punch records</li>}
          {role === "STUDENT" && <li>View your event attendance records</li>}
        </ul>
      </ContentPanel>
    </DashboardPage>
  );
}
