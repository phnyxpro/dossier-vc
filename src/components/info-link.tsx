import { Link, useLocation } from "@tanstack/react-router";
import { HelpCircle } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Small contextual link into the knowledge base, e.g. next to a field label. */
export function InfoLink({
  slug,
  label = "Learn more",
  className,
  returnTo,
}: {
  slug: string;
  label?: string;
  className?: string;
  returnTo?: string;
}) {
  const location = useLocation();
  const backTo = returnTo ?? location.pathname + location.search;
  return (
    <Link
      to="/learn/$slug"
      params={{ slug }}
      search={{ returnTo: backTo }}
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

