"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Menu, ChevronDown, PanelLeftOpen } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { CommandPalette } from "@/components/shared/command-palette";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface NavbarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Navbar({ collapsed = false, onToggleCollapse }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200/70 dark:border-stone-800/70 bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl px-5 sm:px-7 lg:px-10">
      <div className="flex items-center gap-2">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Desktop collapse toggle - only show when collapsed */}
        {collapsed && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-9 w-9 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        <CommandPalette />
        <ThemeToggle />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 px-3 hover:bg-stone-100 dark:hover:bg-stone-800/80 rounded-lg transition-colors"
            />
          }
        >
          <Avatar className="h-7 w-7 ring-2 ring-stone-200 dark:ring-stone-700">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xs font-semibold">
              A
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm text-stone-700 dark:text-stone-300 font-medium">
            Admin HL
          </span>
          <ChevronDown className="h-4 w-4 text-stone-400 dark:text-stone-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">Admin HL</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">admin@hlfinance.com</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30 rounded-lg mx-1 mb-1"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
