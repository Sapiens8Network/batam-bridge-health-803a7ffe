import { AlertTriangle, Inbox, Loader2, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingBlock({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}…
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyBlock({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: typeof Inbox;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorBlock({
  title = "Could not load data",
  description = "The backend API did not respond. You can retry, or continue in mock mode.",
  onRetry,
  offline = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  offline?: boolean;
}) {
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {onRetry ? (
            <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
