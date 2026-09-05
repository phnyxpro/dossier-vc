import { cn } from "@/lib/utils";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
        D
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-base font-bold tracking-tight">DOSSIER</span>
          <span className="mt-0.5 block text-[0.6rem] uppercase tracking-[0.22em] text-accent">
            by Ventureble
          </span>
        </span>
      )}
    </div>
  );
}
