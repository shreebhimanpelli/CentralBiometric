"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredAuth } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FormField, Select } from "@/components/ui/Form";
import { DataField, DataTable, MobileCard, ResponsiveList } from "@/components/ui/DataView";

interface PunchRecord {
  id: string;
  recordType: "staff" | "event";
  punchTime: string;
  direction: string | null;
  deviceId: string | null;
  department: { code: string; name: string } | null;
  event: { id: string; name: string } | null;
  user: { userId: string; name: string; role?: string };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface EventOption {
  id: string;
  name: string;
  startTime: string;
  deviceId: string | null;
}

function DirectionBadge({ direction }: { direction: string | null }) {
  if (!direction) return <span className="text-[var(--muted)]">—</span>;
  return <Badge variant={direction === "IN" ? "green" : "orange"}>{direction}</Badge>;
}

function RecordTypeBadge({ type }: { type: PunchRecord["recordType"] }) {
  return (
    <Badge variant={type === "event" ? "gold" : "blue"}>
      {type === "event" ? "Event" : "Staff"}
    </Badge>
  );
}

export default function PunchesPage() {
  const auth = getStoredAuth();
  const role = auth?.user.role;
  const isAdmin = role === "ADMIN";
  const hodDepartmentId = auth?.user.department?.id ?? "";

  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState(isAdmin ? "" : hodDepartmentId);
  const [eventId, setEventId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeDepartmentId = isAdmin ? departmentId : hodDepartmentId;

  const loadRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeDepartmentId) params.set("departmentId", activeDepartmentId);
    if (eventId) params.set("eventId", eventId);
    if (deviceId) params.set("deviceId", deviceId);
    const query = params.toString();

    apiFetch<PunchRecord[]>(`/api/punches${query ? `?${query}` : ""}`)
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeDepartmentId, eventId, deviceId]);

  const loadEvents = useCallback(() => {
    if (!activeDepartmentId) {
      setEvents([]);
      return;
    }
    apiFetch<EventOption[]>(`/api/events?departmentId=${activeDepartmentId}`)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [activeDepartmentId]);

  const loadDevices = useCallback(() => {
    const params = new URLSearchParams();
    if (activeDepartmentId) params.set("departmentId", activeDepartmentId);
    if (eventId) params.set("eventId", eventId);
    const query = params.toString();

    apiFetch<string[]>(`/api/punches/devices${query ? `?${query}` : ""}`)
      .then(setDevices)
      .catch(() => setDevices([]));
  }, [activeDepartmentId, eventId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (isAdmin) {
      apiFetch<Department[]>("/api/departments")
        .then(setDepartments)
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    loadEvents();
    setEventId("");
    setDeviceId("");
  }, [loadEvents]);

  useEffect(() => {
    loadDevices();
    setDeviceId("");
  }, [loadDevices]);

  function handleDepartmentChange(value: string) {
    setDepartmentId(value);
    setEventId("");
    setDeviceId("");
  }

  const viewLabel = eventId
    ? events.find((e) => e.id === eventId)?.name ?? "Event attendance"
    : "Staff attendance";

  return (
    <DashboardPage
      title="Attendance Records"
      description="Filter by department, then event or staff punches"
      loading={loading}
      loadingMessage="Loading records..."
      error={error}
    >
      <ContentPanel title={viewLabel} description={`${records.length} record(s)`} noPadding>
        <div className="flame-filter-bar">
          {isAdmin ? (
            <FormField label="Department" htmlFor="punch-department">
              <Select
                id="punch-department"
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
              >
                <option value="">Select department (e.g. CS)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField label="Department">
              <Select value={hodDepartmentId} disabled>
                <option value={hodDepartmentId}>
                  {auth?.user.department
                    ? `${auth.user.department.name} (${auth.user.department.code})`
                    : "Your department"}
                </option>
              </Select>
            </FormField>
          )}

          <FormField label="Event" htmlFor="punch-event">
            <Select
              id="punch-event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              disabled={!activeDepartmentId}
            >
              <option value="">
                {activeDepartmentId
                  ? "Staff attendance (no event)"
                  : "Select a department first"}
              </option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                  {ev.deviceId ? ` · ${ev.deviceId}` : ""}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Device ID" htmlFor="punch-device">
            <Select
              id="punch-device"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={!activeDepartmentId}
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

        <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--flame-blue-soft)]">
          <p className="flame-text-small text-[var(--flame-blue)]">
            Shared devices are attributed by context: staff punches use the employee&apos;s department;
            event punches use the event&apos;s department and scheduled time window.
          </p>
        </div>

        {!activeDepartmentId ? (
          <div className="p-6">
            <EmptyState message="Select a department to view attendance records" title="Attendance Records" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-6">
            <EmptyState
              message={
                eventId
                  ? "No event punch records for the selected filters"
                  : "No staff punch records for the selected filters"
              }
              title="Attendance Records"
            />
          </div>
        ) : (
          <ResponsiveList
            mobile={records.map((r) => (
              <MobileCard
                key={r.id}
                header={
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-medium text-flame-blue">{r.user.name}</p>
                      <p className="flame-text-small">{r.user.userId}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RecordTypeBadge type={r.recordType} />
                      <DirectionBadge direction={r.direction} />
                    </div>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <DataField label="Department" value={r.department?.code ?? "—"} />
                  <DataField label="Device" value={r.deviceId || "—"} />
                  <DataField label="Event" value={r.event?.name ?? "—"} />
                  <div className="col-span-2">
                    <DataField label="Punch Time" value={formatDate(r.punchTime)} />
                  </div>
                </div>
              </MobileCard>
            ))}
            desktop={
              <DataTable
                columns={["Type", "Employee", "User ID", "Department", "Event", "Punch Time", "Direction", "Device"]}
              >
                {records.map((r) => (
                  <tr key={r.id}>
                    <td><RecordTypeBadge type={r.recordType} /></td>
                    <td className="font-medium">{r.user.name}</td>
                    <td className="text-[var(--muted)]">{r.user.userId}</td>
                    <td className="text-[var(--muted)]">{r.department?.code ?? "—"}</td>
                    <td className="text-[var(--muted)]">{r.event?.name ?? "—"}</td>
                    <td>{formatDate(r.punchTime)}</td>
                    <td><DirectionBadge direction={r.direction} /></td>
                    <td className="text-[var(--muted)]">{r.deviceId || "—"}</td>
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
