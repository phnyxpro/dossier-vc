import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TrustFooter } from "@/components/trust-footer";
import { useAuth } from "@/lib/auth";

/**
 * Layout for public reference content (knowledge base, glossary).
 *
 * Signed-in visitors get the full workspace chrome. Signed-out visitors — and
 * search / answer-engine crawlers — get the same content in a lightweight
 * public shell instead of being redirected to sign-in.
 */
export function ContentShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (!loading && user) return <AppShell>{children}</AppShell>;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/auth" className="text-sm font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">{children}</main>
      <TrustFooter />
    </div>
  );
}
