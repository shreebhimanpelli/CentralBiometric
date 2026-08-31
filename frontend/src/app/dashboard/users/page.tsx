"use client";

import { useEffect, useState } from "react";
import { apiFetch, roleLabel, type Role } from "@/lib/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ContentPanel } from "@/components/dashboard/ContentPanel";
import { Badge } from "@/components/ui/Badge";
import { DataField, DataTable, MobileCard, ResponsiveList } from "@/components/ui/DataView";

interface UserRow {
  id: string;
  userId: string;
  name: string;
  role: Role;
  batch: string | null;
  department: { name: string; code: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<UserRow[]>("/api/users")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardPage
      title="Users"
      description="Registered system users"
      loading={loading}
      loadingMessage="Loading users..."
      error={error}
    >
      <ContentPanel title="All Users" description={`${users.length} user(s)`} noPadding>
        <ResponsiveList
          mobile={users.map((u) => (
            <MobileCard
              key={u.id}
              header={
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-flame-blue truncate">{u.name}</p>
                    <p className="flame-text-small">{u.userId}</p>
                  </div>
                  <Badge variant="blue">{roleLabel(u.role)}</Badge>
                </div>
              }
            >
              <DataField
                label="Batch"
                value={u.batch ?? "—"}
              />
              <DataField
                label="Department"
                value={u.department ? `${u.department.name} (${u.department.code})` : "—"}
              />
            </MobileCard>
          ))}
          desktop={
            <DataTable columns={["Name", "User ID", "Role", "Batch", "Department"]}>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-[var(--muted)]">{u.userId}</td>
                  <td><Badge variant="blue">{roleLabel(u.role)}</Badge></td>
                  <td className="text-[var(--muted)]">{u.batch ?? "—"}</td>
                  <td className="text-[var(--muted)]">
                    {u.department ? `${u.department.name} (${u.department.code})` : "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
          }
        />
      </ContentPanel>
    </DashboardPage>
  );
}
