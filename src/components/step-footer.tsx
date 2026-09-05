import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "@/lib/icons";
import { Button, Spinner } from "@/components/ui/primitives";

export function StepFooter({
  backTo,
  nextTo,
  nextLabel = "Save and continue",
  onSave,
  saving,
  saved,
}: {
  backTo?: string;
  nextTo?: string;
  nextLabel?: string;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 no-print">
      <div>
        {backTo ? (
          <Link to={backTo}>
            <Button variant="ghost" type="button">
              <ArrowLeft className="size-4" /> Back
            </Button>
          </Link>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? <Spinner /> : null}
          {nextLabel}
          {!saving ? <ArrowRight className="size-4" /> : null}
        </Button>
      </div>
    </div>
  );
}

export function useNextPath(base: string, slug: string) {
  return slug ? `${base}/${slug}` : base;
}
