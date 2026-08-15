import { AlertTriangle, Braces, Check, ChevronDown, Loader2, X } from "lucide-react";
import { useState } from "react";

import { Pill } from "@/components/hub/Pill";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clock, duration } from "@/lib/format";
import type { AiActivityEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const stateIcon = {
  DONE: Check,
  RUNNING: Loader2,
  ATTENTION: AlertTriangle,
  FAILED: X,
} as const;

const stateTone = {
  DONE: "success",
  RUNNING: "info",
  ATTENTION: "warning",
  FAILED: "danger",
} as const;

export function AiActivityPanel({
  events,
  structured,
  className,
}: {
  events: AiActivityEvent[];
  structured?: unknown;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card", className)} aria-label="AI agent activity">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI agent activity</h3>
          <p className="text-xs text-muted-foreground">
            Structured workflow events from the orchestration backend
          </p>
        </div>
        {structured !== undefined ? <StructuredDataDialog data={structured} /> : null}
      </header>

      <ol className="divide-y">
        {events.map((event) => {
          const Icon = stateIcon[event.state];
          return (
            <li key={event.id} className="px-4 py-2.5">
              <Collapsible>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      event.state === "DONE" && "border-success/30 bg-success-soft text-success",
                      event.state === "RUNNING" && "border-info/30 bg-info-soft text-info",
                      event.state === "ATTENTION" &&
                        "border-warning/40 bg-warning-soft text-warning-foreground",
                      event.state === "FAILED" &&
                        "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    <Icon className={cn("size-3.5", event.state === "RUNNING" && "animate-spin")} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {clock(event.at)} · {duration(event.durationMs)}
                    </p>
                  </div>
                  <Pill tone={stateTone[event.state]}>{event.state}</Pill>
                  {event.detail ? (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Toggle technical details"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </CollapsibleTrigger>
                  ) : (
                    <span className="w-7" />
                  )}
                </div>
                {event.detail ? (
                  <CollapsibleContent>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-5 text-muted-foreground">
                      {JSON.stringify(event.detail, null, 2)}
                    </pre>
                  </CollapsibleContent>
                ) : null}
              </Collapsible>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function StructuredDataDialog({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Braces className="size-4" /> View structured AI data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Structured AI output</DialogTitle>
          <DialogDescription>
            Developer view of the structured JSON returned by the backend. Model reasoning is never
            stored or shown.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs leading-5">
          {JSON.stringify(data, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
