import { cn } from "@/lib/utils";

type BadgeVariant = "hot" | "warm" | "cool" | "cold" | "high" | "medium" | "low" | "default";

const variantClasses: Record<BadgeVariant, string> = {
  hot: "bg-red-500/20 text-red-300 border-red-500/30",
  warm: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  cool: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cold: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  high: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  default: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export function statusVariant(status: string | null): BadgeVariant {
  const s = (status ?? "").toLowerCase();
  if (s === "hot") return "hot";
  if (s === "warm") return "warm";
  if (s === "cool") return "cool";
  if (s === "cold") return "cold";
  return "default";
}

export function intentVariant(intent: string | null): BadgeVariant {
  const i = (intent ?? "").toLowerCase();
  if (i === "high") return "high";
  if (i === "medium") return "medium";
  if (i === "low") return "low";
  return "default";
}
