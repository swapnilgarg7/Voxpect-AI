import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md";
}

export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-indigo-600 text-white hover:bg-indigo-500",
        variant === "ghost" && "text-zinc-400 hover:text-white hover:bg-white/5",
        variant === "outline" && "border border-white/10 text-zinc-300 hover:bg-white/5",
        size === "sm" && "h-8 px-3 text-xs gap-1.5",
        size === "md" && "h-9 px-4 text-sm gap-2",
        className
      )}
      {...props}
    />
  );
}
