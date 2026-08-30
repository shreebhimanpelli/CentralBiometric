"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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
  user: { userId: string; name: string; department?: { code: string } };
}

function DirectionBadge({ direction }: { direction: string | null }) {
  if (!direction) return <span className="text-[var(--muted)]">—</span>;
  return <Badge variant={direction === "IN" ? "green" : "orange"}>{direction}</Badge>;
}

export default function PunchesPage() {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Punch[]>("/api/punches")
      .then(setPunches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardPage
      title="Staff Attendance"
      description="Biometric punch records from eSSL devices"
      loading={loading}
      loadingMessage="Loading punches..."
      error={error}
    >
      {punches.length === 0 ? (
        <EmptyState message="No punch records found" title="Punch Records" />
      ) : (
        <ContentPanel title="Punch Records" description={`${punches.length} record(s)`} noPadding>
          <ResponsiveList
            mobile={punches.map((p) => (
              <MobileCard
                key={p.id}
                header={
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-medium text-flame-blue">{p.user.name}</p>
                      <p className="flame-text-small">{p.user.userId}</p>
                    </div>
                    <DirectionBadge direction={p.direction} />
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <DataField label="Department" value={p.user.department?.code ?? "—"} />
                  <DataField label="Device" value={p.deviceId || "—"} />
                  <div className="col-span-2">
                    <DataField label="Punch Time" value={formatDate(p.punchTime)} />
                  </div>
                </div>
              </MobileCard>
            ))}
            desktop={
              <DataTable columns={["Employee", "User ID", "Department", "Punch Time", "Direction", "Device"]}>
                {punches.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.user.name}</td>
                    <td className="text-[var(--muted)]">{p.user.userId}</td>
                    <td className="text-[var(--muted)]">{p.user.department?.code ?? "—"}</td>
                    <td>{formatDate(p.punchTime)}</td>
                    <td><DirectionBadge direction={p.direction} /></td>
                    <td className="text-[var(--muted)]">{p.deviceId || "—"}</td>
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
