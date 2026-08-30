import { cn } from "@/lib/cn";
import { roleLabel, type Role } from "@/lib/api";

const variants = {
  blue: "flame-badge-blue",
  gold: "flame-badge-gold",
  orange: "flame-badge-orange",
  green: "flame-badge-green",
  muted: "flame-badge-muted",
} as const;

export function Badge({
  children,
  variant = "blue",
  className = "",
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return <span className={cn("flame-badge", variants[variant], className)}>{children}</span>;
}

const roleVariants: Record<Role, keyof typeof variants> = {
  ADMIN: "orange",
  HOD: "blue",
  EVENT_COORDINATOR: "gold",
  STAFF: "muted",
  STUDENT: "green",
};

export function RoleBadge({
  role,
  className = "",
  block = false,
}: {
  role: Role;
  className?: string;
  block?: boolean;
}) {
  return (
    <span
      className={cn(
        "flame-badge flame-role-badge",
        variants[roleVariants[role]],
        block && "flame-role-badge-block",
        className
      )}
    >
      {roleLabel(role)}
    </span>
  );
}
