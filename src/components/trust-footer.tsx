import { Link } from "@tanstack/react-router";
import { SUPPORT_EMAIL } from "@/lib/legal/content";

const LINKS = [
  { to: "/security", label: "Security" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/ai-notice", label: "AI notice" },
  { to: "/help", label: "Help" },
  { to: "/accessibility", label: "Accessibility" },
] as const;

export function TrustFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border px-6 py-6 ${className}`}>
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="text-foreground/80 hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-foreground/80 hover:text-foreground hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </nav>
      <p className="mx-auto mt-3 max-w-3xl text-center text-sm text-muted-foreground">
        Ventureble Ltd — Port of Spain, Trinidad and Tobago. Dossier organises information you supply; it is not a
        credit approval, loan recommendation or investment decision.
      </p>
    </footer>
  );
}
