"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Plus, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: BarChart3, exact: true },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 flex-col border-r border-white/10 bg-zinc-950">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <Image src="/logo.png" alt="Voxpect AI" width={28} height={28} className="rounded-lg" />
        <span className="text-sm font-semibold text-white">Voxpect AI</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-indigo-600/20 text-indigo-300"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/dashboard/leads/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600/20 px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-600/30 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </Link>

        {session?.user && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 px-3 py-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                  width={28}
                  height={28}
                  className="rounded-full shrink-0"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-medium text-indigo-300 shrink-0">
                  {(session.user.name ?? "U")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {session.user.name}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
