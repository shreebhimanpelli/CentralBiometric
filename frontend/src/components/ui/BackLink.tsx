import Link from "next/link";
import { cn } from "@/lib/cn";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="text-base text-flame-blue hover:text-flame-orange hover:underline inline-flex items-center gap-1 min-h-[2.5rem] mb-1 transition-colors font-medium"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
