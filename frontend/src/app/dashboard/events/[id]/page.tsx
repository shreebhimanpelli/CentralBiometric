"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  apiFetch,
  downloadApiExport,
  getStoredAuth,
  canManageEvents,
  type Role,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatDeviceIds } from "@/lib/devices";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input, Select, Button } from "@/components/ui/Form";
import { DataField, DataTable, MobileCard, ResponsiveList } from "@/components/ui/DataView";
import { StatCard } from "@/components/ui/StatCard";

interface RosterRow {
  userId: string;
  name: string;
  batch: string | null;
  status: "present" | "absent";
  punchTime: string | null;
  deviceId: string | null;
}

interface RosterResponse {
  event: {
    id: string;
    name: string;
    venue: string | null;
    deviceIds: string[];
    department: { id: string; name: string; code: string };
    startTime: string;
    endTime: string;
  };
  summary: { enrolled: number; present: number; absent: number };
  roster: RosterRow[];
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const role = getStoredAuth()?.user.role as Role;

  const [data, setData] = useState<RosterResponse | null>(null);
  const [devices, setDevices] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [batchToMap, setBatchToMap] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadRoster = useCallback(() => {
    setLoading(true);
    const query = deviceFilter ? `?deviceId=${encodeURIComponent(deviceFilter)}` : "";
    apiFetch<RosterResponse>(`/api/events/${eventId}/roster${query}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId, deviceFilter]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (data?.event?.deviceIds?.length) {
      setDevices(data.event.deviceIds);
      return;
    }
    apiFetch<string[]>("/api/events/devices").then(setDevices).catch(() => {});
  }, [data?.event?.deviceIds]);

  useEffect(() => {
    if (data?.event?.department?.id) {
      apiFetch<string[]>(`/api/events/batches?departmentId=${data.event.department.id}`)
        .then(setBatches)
        .catch(() => {});
    }
  }, [data?.event?.department?.id]);

  async function handleMapBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!batchToMap) return;
    setError("");
    try {
      await apiFetch(`/api/events/${eventId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ batch: batchToMap }),
      });
      setBatchToMap("");
      loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to map batch");
    }
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        body: JSON.stringify({
          userId: studentId,
          deviceId: data?.event.deviceIds?.[0] || undefined,
        }),
      });
      setStudentId("");
      loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record attendance");
    }
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const query = deviceFilter ? `?deviceId=${encodeURIComponent(deviceFilter)}` : "";
      const suffix = deviceFilter ? `-${deviceFilter}` : "";
      await downloadApiExport(
        `/api/events/${eventId}/roster/export${query}`,
        `event-${eventId}${suffix}-roster.csv`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const event = data?.event;
  const roster = data?.roster ?? [];

  return (
    <DashboardPage
      title={event?.name ?? "Event Attendance"}
      description={
        event
          ? `${event.department.name} · ${event.venue ?? "Venue TBD"} · Devices ${formatDeviceIds(event.deviceIds)}`
          : "Loading event details..."
      }
      backHref="/dashboard/events"
      backLabel="Back to Events"
      loading={loading && !data}
      loadingMessage="Loading attendance..."
      error={error}
      action={
        data ? (
          <Button type="button" onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        ) : undefined
      }
    >
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Enrolled" value={data.summary.enrolled} />
          <StatCard label="Present" value={data.summary.present} accent="green" />
          <StatCard label="Absent" value={data.summary.absent} accent="orange" />
        </div>
      )}

      {canManageEvents(role) && (
        <ContentPanel title="Map Students by Batch">
          <form onSubmit={handleMapBatch} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <FormField label="Batch" htmlFor="map-batch">
                <Select
                  id="map-batch"
                  value={batchToMap}
                  onChange={(e) => setBatchToMap(e.target.value)}
                  required
                >
                  <option value="">Select batch (e.g. 2024)</option>
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>
                      Batch {batch}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <Button type="submit" className="w-full sm:w-auto shrink-0">Map Batch</Button>
          </form>
        </ContentPanel>
      )}

      {canManageEvents(role) && (
        <ContentPanel title="Record Attendance">
          <form onSubmit={handleRecord} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <FormField label="Student User ID" htmlFor="studentId">
                <Input
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU2001"
                  required
                />
              </FormField>
            </div>
            <Button type="submit" className="w-full sm:w-auto shrink-0">Record Punch</Button>
          </form>
        </ContentPanel>
      )}

      <ContentPanel title="Attendance Roster" description="Present/absent against mapped students" noPadding>
        <div className="flame-filter-bar">
          <FormField label="Filter by Device ID" htmlFor="roster-device">
            <Select
              id="roster-device"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
            >
              <option value="">All devices (e.g. DEV001)</option>
              {devices.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {roster.length === 0 ? (
          <div className="p-6">
            <EmptyState
              message="No students mapped yet. Map a batch to start tracking attendance."
              title="Attendance Roster"
            />
          </div>
        ) : (
          <ResponsiveList
            mobile={roster.map((row) => (
              <MobileCard
                key={row.userId}
                header={
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-medium text-flame-blue">{row.name}</p>
                      <p className="flame-text-small">{row.userId}</p>
                    </div>
                    <Badge variant={row.status === "present" ? "green" : "orange"}>
                      {row.status === "present" ? "Present" : "Absent"}
                    </Badge>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <DataField label="Batch" value={row.batch ?? "—"} />
                  <DataField label="Device" value={row.deviceId ?? "—"} />
                  <div className="col-span-2">
                    <DataField
                      label="Punch Time"
                      value={row.punchTime ? formatDate(row.punchTime) : "—"}
                    />
                  </div>
                </div>
              </MobileCard>
            ))}
            desktop={
              <DataTable columns={["Student", "User ID", "Batch", "Status", "Punch Time", "Device"]}>
                {roster.map((row) => (
                  <tr key={row.userId}>
                    <td className="font-medium">{row.name}</td>
                    <td className="text-[var(--muted)]">{row.userId}</td>
                    <td className="text-[var(--muted)]">{row.batch ?? "—"}</td>
                    <td>
                      <Badge variant={row.status === "present" ? "green" : "orange"}>
                        {row.status === "present" ? "Present" : "Absent"}
                      </Badge>
                    </td>
                    <td>{row.punchTime ? formatDate(row.punchTime) : "—"}</td>
                    <td className="text-[var(--muted)]">{row.deviceId ?? "—"}</td>
                  </tr>
                ))}
              </DataTable>
            }
          />
        )}
      </ContentPanel>
    </DashboardPage>
  );
}
