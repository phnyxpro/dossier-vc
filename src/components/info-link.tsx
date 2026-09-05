import { Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small contextual link into the knowledge base, e.g. next to a field label. */
export function InfoLink({
  slug,
  label = "Learn more",
  className,
}: {
  slug: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      to="/learn/$slug"
      params={{ slug }}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
        className,
      )}
    >
      <HelpCircle className="size-3.5" />
      {label}
    </Link>
  );
}
