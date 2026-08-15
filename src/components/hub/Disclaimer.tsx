import { ShieldAlert } from "lucide-react";

import { MEDICAL_DISCLAIMER } from "@/lib/status";
import { cn } from "@/lib/utils";

export function MedicalDisclaimer({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border border-border bg-muted/60 p-3 text-muted-foreground",
        compact ? "text-[11px] leading-4" : "text-xs leading-5",
        className,
      )}
      role="note"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
