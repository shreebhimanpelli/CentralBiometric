export type Role = "ADMIN" | "HOD" | "EVENT_COORDINATOR" | "STAFF" | "STUDENT";

export interface User {
  id: string;
  userId: string;
  name: string;
  role: Role;
  department?: { id: string; name: string; code: string } | null;
}

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const BACKEND_DOWN_MESSAGE =
  "Cannot reach the API. Start the backend in another terminal: cd backend && npm run dev";

export async function parseApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(res.ok ? "Empty response from server" : BACKEND_DOWN_MESSAGE);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.startsWith("Internal Server Error") || text.includes("<!DOCTYPE")) {
      throw new Error(BACKEND_DOWN_MESSAGE);
    }
    throw new Error(res.ok ? "Invalid response from server" : text.slice(0, 120));
  }
}

export function getStoredAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("flame_auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: AuthState | null) {
  if (typeof window === "undefined") return;
  if (auth) {
    localStorage.setItem("flame_auth", JSON.stringify(auth));
  } else {
    localStorage.removeItem("flame_auth");
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = getStoredAuth();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && auth?.refreshToken) {
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await parseApiResponse<{ accessToken: string; user: User }>(refreshRes);
      const newAuth = { ...auth, accessToken: data.accessToken, user: data.user };
      setStoredAuth(newAuth);
      headers.Authorization = `Bearer ${data.accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      setStoredAuth(null);
      window.location.href = "/";
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const err = await parseApiResponse<{ error?: string }>(res).catch((e) => ({
      error: e instanceof Error ? e.message : "Request failed",
    }));
    throw new Error(err.error || "Request failed");
  }

  return parseApiResponse<T>(res);
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    ADMIN: "System Admin",
    HOD: "HOD",
    EVENT_COORDINATOR: "Event Coordinator",
    STAFF: "Staff",
    STUDENT: "Student",
  };
  return labels[role];
}

export function canViewStaffPunches(role: Role) {
  return role === "ADMIN" || role === "HOD";
}

export function canViewEvents(role: Role) {
  return true;
}

export function canManageEvents(role: Role) {
  return role === "ADMIN" || role === "EVENT_COORDINATOR";
}

export function canViewEventAttendance(role: Role) {
  return ["ADMIN", "HOD", "EVENT_COORDINATOR", "STUDENT"].includes(role);
}
