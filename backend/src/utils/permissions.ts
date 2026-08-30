import { TokenPayload } from "./jwt";

export function canViewStaffPunches(user: TokenPayload): boolean {
  return user.role === "ADMIN" || user.role === "HOD";
}

export function canViewAllStaffPunches(user: TokenPayload): boolean {
  return user.role === "ADMIN";
}

export function canViewStudentAttendance(user: TokenPayload): boolean {
  return user.role === "ADMIN" || user.role === "HOD" || user.role === "EVENT_COORDINATOR";
}

export function canManageEvents(user: TokenPayload): boolean {
  return user.role === "ADMIN" || user.role === "EVENT_COORDINATOR";
}

export function canAdminEvents(user: TokenPayload): boolean {
  return user.role === "ADMIN";
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "System Admin",
    HOD: "HOD",
    EVENT_COORDINATOR: "Event Coordinator",
    STAFF: "Staff",
    STUDENT: "Student",
  };
  return labels[role] || role;
}
