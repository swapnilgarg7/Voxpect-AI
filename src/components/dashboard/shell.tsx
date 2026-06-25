"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/sidebar";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: BarChart3, exact: true },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Desktop: fixed left sidebar */}
      <Sidebar />

      {/* Main content — full width on mobile, offset on desktop */}
      <main className="md:pl-56">
        {/* Extra bottom padding on mobile so content clears the bottom nav */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile: fixed bottom tab bar — hidden on md+ */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/10 bg-zinc-950/95 backdrop-blur-sm md:hidden">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                active ? "text-indigo-300" : "text-zinc-500"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-indigo-400" : "text-zinc-500")} />
              {label}
            </Link>
          );
        })}

        {/* New Lead action — accent pill */}
        <Link
          href="/dashboard/leads/new"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
            pathname === "/dashboard/leads/new" ? "text-indigo-300" : "text-zinc-500"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              pathname === "/dashboard/leads/new"
                ? "bg-indigo-500"
                : "bg-indigo-600"
            )}
          >
            <Plus className="h-4 w-4 text-white" />
          </span>
          New Lead
        </Link>
      </nav>
    </div>
  );
}
