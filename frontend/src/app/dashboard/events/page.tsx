"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredAuth, canManageEvents, type Role } from "@/lib/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";
import { EventCard } from "@/components/dashboard/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Select, MultiSelect, Button } from "@/components/ui/Form";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

interface Event {
  id: string;
  name: string;
  description: string | null;
  venue: string | null;
  deviceIds: string[];
  startTime: string;
  endTime: string;
  department: { name: string; code: string };
  coordinators: { user: { name: string } }[];
  _count?: { attendance: number; enrollments: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const EMPTY_EVENT_FORM = {
  name: "",
  description: "",
  venue: "",
  deviceIds: [] as string[],
  batch: "",
  startTime: "",
  endTime: "",
  departmentId: "",
};

export default function EventsPage() {
  const auth = getStoredAuth();
  const role = auth?.user.role as Role;
  const userDeptId = auth?.user.department?.id ?? "";

  const [events, setEvents] = useState<Event[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [error, setError] = useState("");

  const isAdmin = role === "ADMIN";
  const lockDepartment = !isAdmin && Boolean(userDeptId);

  function loadEvents() {
    apiFetch<Event[]>("/api/events")
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function loadBatches(departmentId: string) {
    if (!departmentId) {
      setBatches([]);
      return;
    }
    apiFetch<string[]>(`/api/events/batches?departmentId=${departmentId}`)
      .then(setBatches)
      .catch(() => setBatches([]));
  }

  useEffect(() => {
    loadEvents();
    apiFetch<Department[]>("/api/departments").then(setDepartments).catch(() => {});
    apiFetch<string[]>("/api/events/devices").then(setDevices).catch(() => {});
  }, []);

  useEffect(() => {
    loadBatches(form.departmentId || userDeptId);
  }, [form.departmentId, userDeptId]);

  function openForm() {
    const departmentId = lockDepartment ? userDeptId : "";
    setForm({ ...EMPTY_EVENT_FORM, departmentId });
    if (departmentId) loadBatches(departmentId);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          venue: form.venue || undefined,
          deviceIds: form.deviceIds.length ? form.deviceIds : undefined,
          batch: form.batch || undefined,
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
          departmentId: form.departmentId || undefined,
        }),
      });
      setShowForm(false);
      setForm(EMPTY_EVENT_FORM);
      setLoading(true);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    }
  }

  return (
    <DashboardPage
      title="Events"
      description="Department events and student attendance"
      loading={loading}
      loadingMessage="Loading events..."
      error={error}
      action={
        canManageEvents(role) ? (
          <Button
            type="button"
            onClick={() => (showForm ? setShowForm(false) : openForm())}
            className="w-full sm:w-auto"
          >
            {showForm ? "Cancel" : "Create Event"}
          </Button>
        ) : undefined
      }
    >
      {showForm && (
        <ContentPanel title="New Event">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Event Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. CS Tech Fest 2026"
                  required
                />
              </FormField>
              <FormField label="Description">
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Annual technical festival for the department"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Department" htmlFor="event-department">
                <Select
                  id="event-department"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value, batch: "" })}
                  disabled={lockDepartment}
                  required={isAdmin}
                >
                  <option value="" disabled>
                    Select department (e.g. Computer Science)
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Venue" htmlFor="event-venue">
                <Input
                  id="event-venue"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g. Main Auditorium"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Device ID" htmlFor="event-device">
                <MultiSelect
                  id="event-device"
                  value={form.deviceIds}
                  onChange={(deviceIds) => setForm({ ...form, deviceIds })}
                  placeholder="Select devices (e.g. DEV001)"
                >
                  {devices.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </MultiSelect>
              </FormField>

              <FormField label="Student Batch" htmlFor="event-batch">
                <Select
                  id="event-batch"
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                >
                  <option value="">Map batch later (optional)</option>
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>
                      Batch {batch}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div>
              <p className="flame-label mb-3">Schedule</p>
              <div className="flame-schedule-section">
                <DateTimePicker
                  label="Start Time"
                  value={form.startTime}
                  onChange={(startTime) => setForm({ ...form, startTime })}
                  placeholder="e.g. Sep 6, 2026 · 9:00 AM"
                  required
                />
                <DateTimePicker
                  label="End Time"
                  value={form.endTime}
                  onChange={(endTime) => setForm({ ...form, endTime })}
                  min={form.startTime}
                  placeholder="e.g. Sep 6, 2026 · 5:00 PM"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto">Create Event</Button>
          </form>
        </ContentPanel>
      )}

      {events.length === 0 ? (
        <EmptyState message="No events found" title="Events" />
      ) : (
        events.map((ev) => <EventCard key={ev.id} event={ev} />)
      )}
    </DashboardPage>
  );
}
