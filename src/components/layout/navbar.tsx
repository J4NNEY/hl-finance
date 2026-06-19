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
import { LogOut, Menu, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { CommandPalette } from "@/components/shared/command-palette";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-950/70 backdrop-blur-xl px-6">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Menu className="h-5 w-5" />
              </Button>
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <CommandPalette />
        <ThemeToggle />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 px-3 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
            />
          }
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              A
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm text-stone-700 dark:text-stone-300 font-medium">
            Admin HL
          </span>
          <ChevronDown className="h-4 w-4 text-stone-400 dark:text-stone-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">Admin HL</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">admin@hlfinance.com</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
