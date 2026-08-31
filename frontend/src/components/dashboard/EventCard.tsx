import Link from "next/link";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Form";
import { ContentPanel } from "@/components/dashboard/ContentPanel";

export interface EventSummary {
  id: string;
  name: string;
  description: string | null;
  venue?: string | null;
  deviceId?: string | null;
  startTime: string;
  endTime: string;
  department: { name: string; code: string };
  _count?: { attendance: number; enrollments: number };
}

function eventStatus(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now < s) return { label: "Upcoming", variant: "blue" as const };
  if (now > e) return { label: "Ended", variant: "muted" as const };
  return { label: "Active", variant: "green" as const };
}

export function EventCard({ event }: { event: EventSummary }) {
  const status = eventStatus(event.startTime, event.endTime);
  const enrolled = event._count?.enrollments ?? 0;
  const present = event._count?.attendance ?? 0;

  return (
    <ContentPanel noPadding>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-headline font-semibold text-flame-blue">{event.name}</h3>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {event.description && (
              <p className="flame-text-muted mb-2">{event.description}</p>
            )}
            <p className="flame-text-muted">
              {event.department.name} ({event.department.code})
            </p>
            {event.venue && (
              <p className="flame-text-muted mt-1">Venue: {event.venue}</p>
            )}
            {event.deviceId && (
              <p className="flame-text-muted mt-1">Device: {event.deviceId}</p>
            )}
            <p className="flame-text-muted mt-1">
              {formatDate(event.startTime)} — {formatDate(event.endTime)}
            </p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--border)] shrink-0">
            <div className="text-center sm:text-right">
              <p className="text-2xl font-headline font-bold text-flame-blue">
                {present}/{enrolled}
              </p>
              <p className="flame-text-small">present / enrolled</p>
            </div>
            <Link href={`/dashboard/events/${event.id}`}>
              <Button variant="secondary" className="w-full sm:w-auto">
                View Attendance
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ContentPanel>
  );
}
