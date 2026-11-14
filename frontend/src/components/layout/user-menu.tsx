"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon, Shield, Laptop } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authApi } from "@/lib/api";
import { User } from "@/lib/types";

export interface UserMenuProps {
  user: User | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const handleLogout = () => {
    authApi.logout();
    router.push("/login");
  };

  const email = user?.email || "researcher@local";
  const initials = email.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs text-foreground hover:border-zinc-500 hover:bg-surface-hover transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[10px] font-mono font-bold text-primary">
            {initials}
          </div>
          <span className="hidden md:inline font-mono text-[11px] max-w-[120px] truncate">
            {email}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-semibold leading-none text-foreground">{email}</p>
            <p className="text-[10px] leading-none text-muted-foreground font-mono">
              Role: Lead Investigator
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center cursor-pointer">
            <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>Workspace Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/observability" className="flex items-center cursor-pointer">
            <Laptop className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>Hardware Diagnostics</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dev/components" className="flex items-center cursor-pointer">
            <Shield className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>UI Component Library</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
