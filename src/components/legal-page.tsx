import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand";
import { TrustFooter } from "@/components/trust-footer";
import type { LegalDoc } from "@/lib/legal/content";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/">
            <BrandMark />
          </Link>
          <Link to="/auth" className="text-sm font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-foreground">{doc.title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{doc.summary}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Version {doc.version} · Last updated {doc.updated}
        </p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold text-foreground">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-base leading-relaxed text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      <TrustFooter />
    </div>
  );
}

export function legalHead(doc: LegalDoc) {
  const title = `${doc.title} — Dossier by Ventureble`;
  return {
    meta: [
      { title },
      { name: "description", content: doc.summary },
      { property: "og:title", content: title },
      { property: "og:description", content: doc.summary },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
