import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Bot,
  HeartPulse,
  Menu,
  Search,
  Send,
  MessageSquare,
  ChevronsUpDown,
} from "lucide-react";
import { useState } from "react";

import { navItems } from "@/components/layout/nav";
import { Pill } from "@/components/hub/Pill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";

import { useUi } from "@/lib/ui-store";
import { dashboardQuery, referenceQuery } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {navItems.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-sidebar-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarStatus() {
  const { connections, activeHospitalId } = useUi();
  const { data: reference } = useQuery(referenceQuery());
  const hospitals = reference?.hospitals ?? [];
  const hospital = hospitals.find((h) => h.id === activeHospitalId) ?? hospitals[0];
  const rows = [
    { label: "AI Agent", value: connections.ai ? "ONLINE" : "OFFLINE", ok: connections.ai },
    {
      label: "WhatsApp",
      value: connections.whatsapp ? "CONNECTED" : "DISCONNECTED",
      ok: connections.whatsapp,
    },
    {
      label: "Telegram",
      value: connections.telegram ? "CONNECTED" : "DISCONNECTED",
      ok: connections.telegram,
    },
  ];
  return (
    <div className="space-y-2 border-t border-sidebar-border px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
          Hospital
        </p>
        <p className="truncate text-sm font-semibold text-sidebar-foreground">
          {hospital?.name ?? "Loading…"}
        </p>
      </div>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-[11px]">
            <dt className="text-sidebar-foreground/60">{row.label}</dt>
            <dd className="flex items-center gap-1.5 font-semibold text-sidebar-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  row.ok ? "bg-sidebar-primary" : "bg-destructive",
                )}
              />
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Brand() {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4"
    >
      <span className="journey-gradient flex size-8 items-center justify-center rounded-lg text-primary-foreground">
        <HeartPulse className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-sidebar-foreground">
          MedBridge Pass
        </span>
        <span className="block truncate text-[10px] text-sidebar-foreground/60">
          Singapore ↔ Batam
        </span>
      </span>
    </Link>
  );
}

function TopBar() {
  const { connections, activeHospitalId, setActiveHospital } = useUi();
  const { data: reference } = useQuery(referenceQuery());
  const { data: dashboard } = useQuery(dashboardQuery());
  const hospitals = reference?.hospitals ?? [];
  const feed = dashboard?.feed ?? [];
  const hospital = hospitals.find((h) => h.id === activeHospitalId) ?? hospitals[0];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:px-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <Brand />
            <NavList />
            <SidebarStatus />
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-52 justify-between gap-2">
            <span className="truncate">{hospital?.name ?? "Loading…"}</span>
            <ChevronsUpDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Switch hospital</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hospitals.map((h) => (
            <DropdownMenuItem key={h.id} onClick={() => setActiveHospital(h.id)}>
              <span className="truncate">{h.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative hidden min-w-0 flex-1 md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients, inquiries, references…" className="h-9 pl-8" />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 xl:flex">
          <Pill tone={connections.ai ? "success" : "danger"} dot>
            <Bot className="size-3" /> AI {connections.ai ? "online" : "offline"}
          </Pill>
          <Pill tone={connections.whatsapp ? "success" : "danger"} dot>
            <MessageSquare className="size-3" /> WhatsApp
          </Pill>
          <Pill tone={connections.telegram ? "info" : "danger"} dot>
            <Send className="size-3" /> Telegram
          </Pill>
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="size-5" />
              {feed.length > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-card" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {feed.slice(0, 6).map((item) => (
              <DropdownMenuItem key={item.id} className="text-xs">
                <span className="truncate">{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User profile">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                AI
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              Aisha Idris
              <span className="block text-[11px] font-normal text-muted-foreground">
                Patient coordinator
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function HospitalShell({ children }: { children: React.ReactNode }) {
  const [, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <Brand />
        <NavList onNavigate={() => setOpen(false)} />
        <SidebarStatus />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
