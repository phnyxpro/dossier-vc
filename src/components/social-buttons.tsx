import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.98 11.98 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.5.96 1.39 2.1 2.94 3.6 2.88 1.45-.06 2-.93 3.74-.93s2.24.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.8 1.1-1.61 1.56-3.17 1.58-3.25-.03-.02-3.04-1.17-3.07-4.6ZM14.14 4.06c.8-.97 1.34-2.31 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.63Z" />
    </svg>
  );
}

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

type Provider = "google" | "apple" | "microsoft";

const PROVIDERS: {
  id: Provider;
  label: string;
  Logo: (props: { className?: string }) => React.ReactNode;
}[] = [
  { id: "google", label: "Google", Logo: GoogleLogo },
  { id: "apple", label: "Apple", Logo: AppleLogo },
  { id: "microsoft", label: "Microsoft", Logo: MicrosoftLogo },
];

/**
 * Side-by-side brand-icon buttons for OAuth sign-in. Provider names are kept
 * as accessible labels only.
 */
export function SocialButtons({
  onSelect,
  disabled,
}: {
  onSelect: (provider: Provider) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {PROVIDERS.map(({ id, label, Logo }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          onClick={() => onSelect(id)}
          disabled={disabled}
          aria-label={`Continue with ${label}`}
          title={`Continue with ${label}`}
          className={cn("h-11 w-full")}
        >
          <Logo className="size-5" />
        </Button>
      ))}
    </div>
  );
}
