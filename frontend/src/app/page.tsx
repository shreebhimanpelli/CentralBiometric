"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAuth, setStoredAuth, API_BASE, parseApiResponse, type User, type Role } from "@/lib/api";
import { FlameLogo } from "@/components/FlameLogo";
import { FormField, Input, Button } from "@/components/ui/Form";
import { Alert } from "@/components/ui/Alert";

const DEMO_ACCOUNTS = [
  { userId: "ADMIN001", password: "admin123", label: "System Admin" },
  { userId: "EMP1001", password: "hod123", label: "HOD (CS)" },
  { userId: "EMP1003", password: "coord123", label: "Event Coordinator" },
  { userId: "EMP1002", password: "staff123", label: "Staff" },
  { userId: "STU2001", password: "student123", label: "Student" },
];

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredAuth()) router.replace("/dashboard");
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const data = await parseApiResponse<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; userId: string; name: string; role: string };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Login failed");

      setStoredAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: { ...data.user, role: data.user.role as Role } as User,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Cannot reach the API. Make sure the backend is running: cd backend && npm run dev");
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flame-login-page">
      <div className="flame-login-bg" aria-hidden />
      <div className="flame-login-overlay" aria-hidden />

      <div className="flame-login-content">
        <div className="flame-login-card">
          <div className="flame-login-card-accent" aria-hidden />

          <div className="flame-login-card-header">
            <FlameLogo size="login" centered className="mx-auto" />
            <h1 className="flame-login-title">FLAME Biometric</h1>
            <p className="flame-login-subtitle">Centralized Attendance System</p>
          </div>

          <form onSubmit={handleLogin} className="flame-login-form">
            {error && <Alert message={error} />}

            <FormField label="User ID" htmlFor="userId">
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. ADMIN001"
                autoComplete="username"
                required
              />
            </FormField>

            <FormField label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </FormField>

            <Button type="submit" disabled={loading} className="w-full flame-login-submit">
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="flame-login-demo">
              <p className="flame-login-demo-label">Quick demo access</p>
              <div className="flame-login-demo-grid">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.userId}
                    type="button"
                    onClick={() => {
                      setUserId(a.userId);
                      setPassword(a.password);
                    }}
                    className="flame-login-demo-btn"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        <p className="flame-login-footer">FLAME University · Biometric Attendance Portal</p>
      </div>
    </div>
  );
}
