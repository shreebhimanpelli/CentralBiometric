import Image from "next/image";
import { cn } from "@/lib/cn";

const LOGO_SRC = "/flame-university-logo.webp";

interface FlameLogoProps {
  size?: "sidebar" | "sidebar-compact" | "sidebar-collapsed" | "header" | "login";
  className?: string;
  centered?: boolean;
}

const sizeStyles: Record<NonNullable<FlameLogoProps["size"]>, string> = {
  header: "h-11 max-w-[104px]",
  sidebar: "h-[4rem] max-w-[180px] lg:h-[4.5rem] lg:max-w-[200px]",
  "sidebar-compact": "h-10 max-w-[80px]",
  "sidebar-collapsed": "h-9 w-9 max-w-[36px]",
  login: "h-[4.25rem] max-w-[10.5rem] sm:h-[4.75rem] sm:max-w-[11.5rem]",
};

export function FlameLogo({
  size = "sidebar",
  className = "",
  centered = false,
}: FlameLogoProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center",
        centered && "justify-center mx-auto",
        sizeStyles[size],
        className
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="FLAME University"
        width={228}
        height={84}
        className={cn(
          "h-full w-auto max-w-full object-contain",
          centered ? "object-center" : "object-left"
        )}
        priority={size === "login"}
        sizes={
          size === "header"
            ? "104px"
            : size === "login"
              ? "168px"
              : size === "sidebar-compact"
                ? "80px"
              : size === "sidebar-collapsed"
                ? "36px"
                : "200px"
        }
      />
    </div>
  );
}
