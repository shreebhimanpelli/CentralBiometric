"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredAuth, type Role } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DataField, DataTable, MobileCard, ResponsiveList } from "@/components/ui/DataView";

interface Punch {
  id: string;
  punchTime: string;
  direction: string | null;
  deviceId: string | null;
}

interface Attendance {
  id: string;
  punchTime: string;
  event: { name: string };
}

function DirectionBadge({ direction }: { direction: string | null }) {
  if (!direction) return <span className="text-[var(--muted)]">—</span>;
  return <Badge variant={direction === "IN" ? "green" : "orange"}>{direction}</Badge>;
}

export default function MyAttendancePage() {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = getStoredAuth()?.user.role as Role;

  useEffect(() => {
    const promises: Promise<void>[] = [];

    if (role === "STAFF") {
      promises.push(
        apiFetch<Punch[]>("/api/punches")
          .then(setPunches)
          .catch((e) => setError(e.message))
      );
    }

    if (role === "STUDENT") {
      promises.push(
        apiFetch<{ id: string; name: string }[]>("/api/events")
          .then(async (events) => {
            const all: Attendance[] = [];
            for (const ev of events) {
              const records = await apiFetch<Attendance[]>(`/api/events/${ev.id}/attendance`);
              all.push(...records.map((r) => ({ ...r, event: { name: ev.name } })));
            }
            setAttendance(all);
          })
          .catch((e) => setError(e.message))
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [role]);

  const isEmpty = role === "STAFF" ? punches.length === 0 : attendance.length === 0;

  return (
    <DashboardPage
      title="My Attendance"
      description={role === "STAFF" ? "Your biometric punch records" : "Your event attendance records"}
      loading={loading}
      error={error}
    >
      {isEmpty ? (
        <EmptyState
          message="No records"
          title={role === "STAFF" ? "Punch Records" : "Event Records"}
        />
      ) : role === "STAFF" ? (
        <ContentPanel title="Punch Records" description={`${punches.length} record(s)`} noPadding>
          <ResponsiveList
            mobile={punches.map((p) => (
              <MobileCard
                key={p.id}
                header={
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-base font-medium">{formatDate(p.punchTime)}</p>
                    <DirectionBadge direction={p.direction} />
                  </div>
                }
              >
                <DataField label="Device" value={p.deviceId || "—"} />
              </MobileCard>
            ))}
            desktop={
              <DataTable columns={["Punch Time", "Direction", "Device"]}>
                {punches.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.punchTime)}</td>
                    <td><DirectionBadge direction={p.direction} /></td>
                    <td className="text-[var(--muted)]">{p.deviceId || "—"}</td>
                  </tr>
                ))}
              </DataTable>
            }
          />
        </ContentPanel>
      ) : (
        <ContentPanel title="Event Records" description={`${attendance.length} record(s)`} noPadding>
          <ResponsiveList
            mobile={attendance.map((a) => (
              <MobileCard key={a.id}>
                <p className="text-base font-medium text-flame-blue">{a.event.name}</p>
                <div className="mt-2">
                  <DataField label="Punch Time" value={formatDate(a.punchTime)} />
                </div>
              </MobileCard>
            ))}
            desktop={
              <DataTable columns={["Event", "Punch Time"]}>
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.event.name}</td>
                    <td>{formatDate(a.punchTime)}</td>
                  </tr>
                ))}
              </DataTable>
            }
          />
        </ContentPanel>
      )}
    </DashboardPage>
  );
}
