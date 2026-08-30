"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, getStoredAuth, canManageEvents, type Role } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Button } from "@/components/ui/Form";
import { DataField, DataTable, MobileCard, ResponsiveList } from "@/components/ui/DataView";

interface Attendance {
  id: string;
  punchTime: string;
  user: { userId: string; name: string };
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const role = getStoredAuth()?.user.role as Role;

  function loadAttendance() {
    apiFetch<Attendance[]>(`/api/events/${eventId}/attendance`)
      .then(setAttendance)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAttendance();
  }, [eventId]);

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch(`/api/events/${eventId}/attendance`, {
        method: "POST",
        body: JSON.stringify({ userId: studentId }),
      });
      setStudentId("");
      setLoading(true);
      loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record attendance");
    }
  }

  return (
    <DashboardPage
      title="Event Attendance"
      description={`${attendance.length} record(s)`}
      backHref="/dashboard/events"
      backLabel="Back to Events"
      loading={loading}
      loadingMessage="Loading attendance..."
      error={error}
    >
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
            <Button type="submit" className="w-full sm:w-auto shrink-0">Record Attendance</Button>
          </form>
        </ContentPanel>
      )}

      {attendance.length === 0 ? (
        <EmptyState message="No attendance records" title="Attendance Records" />
      ) : (
        <ContentPanel title="Attendance Records" description={`${attendance.length} student(s)`} noPadding>
          <ResponsiveList
            mobile={attendance.map((a) => (
              <MobileCard key={a.id}>
                <p className="text-base font-medium text-flame-blue">{a.user.name}</p>
                <p className="flame-text-small">{a.user.userId}</p>
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  <DataField label="Punch Time" value={formatDate(a.punchTime)} />
                </div>
              </MobileCard>
            ))}
            desktop={
              <DataTable columns={["Student", "User ID", "Punch Time"]}>
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.user.name}</td>
                    <td className="text-[var(--muted)]">{a.user.userId}</td>
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
