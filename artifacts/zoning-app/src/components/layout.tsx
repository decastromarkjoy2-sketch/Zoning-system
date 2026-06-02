import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  FileText, 
  CheckSquare, 
  Database, 
  Users, 
  History, 
  Bell, 
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronDown
} from "lucide-react";

import { useGetDashboardSummary } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navGroups = [
  {
    title: "Core",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/map", label: "GIS Map", icon: MapIcon },
      { href: "/zoning-records", label: "Zoning Records", icon: FileText },
    ],
  },
  {
    title: "Workflow",
    items: [
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/kobo", label: "KoboToolbox", icon: Database },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/audit-logs", label: "Audit Logs", icon: History },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  
  const { data: summary } = useGetDashboardSummary();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30 lg:flex-row">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapIcon className="h-5 w-5" />
            </div>
            <span className="text-lg">Zoning System</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navGroups.map((group, i) => (
              <div key={i} className="mb-6">
                <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {group.title}
                </h4>
                {group.items.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {item.label === "Approvals" && summary?.pending_validations ? (
                        <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs">
                          {summary.pending_validations}
                        </Badge>
                      ) : null}
                      {item.label === "Notifications" && summary?.unread_notifications ? (
                        <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-xs">
                          {summary.unread_notifications}
                        </Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold md:text-xl">
              {navGroups.flatMap(g => g.items).find(i => location.startsWith(i.href))?.label || "Zoning System"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {summary?.unread_notifications ? (
                  <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">PO</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:inline-block">Planning Officer</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login" className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
