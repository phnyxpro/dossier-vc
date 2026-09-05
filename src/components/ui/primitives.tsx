import { cn } from "@/lib/utils";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "accent" && "bg-accent text-accent-foreground hover:bg-accent/90",
        variant === "outline" && "border border-border bg-transparent text-foreground hover:bg-secondary",
        variant === "ghost" && "text-muted-foreground hover:bg-secondary hover:text-foreground",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className,
      )}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("rounded-lg border border-border bg-card shadow-panel", className)}
    />
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Label({ className, ...props }: HTMLAttributes<HTMLLabelElement> & { htmlFor?: string }) {
  return <label {...props} className={cn("label-caps mb-1.5 block", className)} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    />
  );
}

type Tone = "default" | "primary" | "accent" | "success" | "warning" | "danger" | "muted";

export function Badge({ tone = "default", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider",
        tone === "default" && "bg-secondary text-secondary-foreground",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-destructive/15 text-destructive",
        tone === "muted" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <Card className="p-5">
      <p className="label-caps">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold tabular-nums",
          tone === "accent" && "text-accent",
          tone === "primary" && "text-primary",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "accent" | "success" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "primary" && "bg-primary",
          tone === "accent" && "bg-accent",
          tone === "success" && "bg-success",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}
