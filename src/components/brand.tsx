import { cn } from "@/lib/utils";
import vMark from "@/assets/ventureble-v.png.asset.json";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={vMark.url}
        alt="Ventureble"
        className="size-8 shrink-0 object-contain"
        width={32}
        height={32}
      />
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
