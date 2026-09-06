import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "@/lib/icons";
import { Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Password field with a show/hide toggle. Keeps the shared Input styling and
 * simply swaps the input type so browsers keep autofill behaviour.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        aria-describedby={hintId}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
      <span id={hintId} className="sr-only">
        {visible ? "Password is visible" : "Password is hidden"}
      </span>
    </div>
  );
}
