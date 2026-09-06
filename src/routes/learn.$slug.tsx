import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Clock } from "@/lib/icons";
import { ContentShell } from "@/components/content-shell";
import { Badge, Card, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { ARTICLE_BY_SLUG } from "@/lib/learn/content";
import { useLearnContent } from "@/lib/learn/localized";
import { useLanguage } from "@/lib/i18n";
import { absoluteUrl, breadcrumbLd, canonicalTags, jsonLd, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/learn/$slug")({
  validateSearch: z.object({
    returnTo: z.string().optional(),
  }),
  head: ({ params }) => {

    const article = ARTICLE_BY_SLUG[params.slug];
    if (!article) {
      return {
        meta: [
          { title: "Guide not found — Dossier by Ventureble" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${article.title} — Dossier by Ventureble`;
    const path = `/learn/${article.slug}`;
    return {
      links: [canonicalTags(path).link],
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.summary,
          url: absoluteUrl(path),
          inLanguage: "en",
          articleSection: article.category,
          isAccessibleForFree: true,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Ventureble Ltd" },
        }),
        jsonLd(
          breadcrumbLd([
            { name: "Dossier by Ventureble", path: "/" },
            { name: "Knowledge base", path: "/learn" },
            { name: article.title, path },
          ]),
        ),
      ],
      meta: [
        canonicalTags(path).meta,
        { title },
        { name: "description", content: article.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: article.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { t } = useLanguage();
  const { articleBySlug } = useLearnContent();
  const { returnTo } = Route.useSearch();
  const router = useRouter();
  const article = articleBySlug[slug];

  const backHref = returnTo || "/learn";
  const BackLink = (
    <a
      href={backHref}
      onClick={(e) => {
        e.preventDefault();
        router.history.push(backHref);
      }}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> {t("learn.back")}
    </a>
  );

  if (!article) {
    return (
      <ContentShell>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            title={t("learn.notFoundTitle")}
            description={t("learn.notFoundBody")}
            action={
              <Link to="/learn" className="text-sm font-medium text-primary hover:underline">
                {t("learn.backLink")}
              </Link>
            }
          />
        </div>
      </ContentShell>
    );
  }

  return (
    <ContentShell>
      <div className="mx-auto max-w-3xl">
        {BackLink}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone="default">{article.category}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {article.readMinutes} {t("learn.readMin")}
          </span>
        </div>
        <SectionTitle>{article.title}</SectionTitle>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{article.summary}</p>
          <div className="mt-6 space-y-8">
            {article.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-base font-semibold text-foreground">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
                {s.bullets ? (
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </Card>

        {article.related?.length ? (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("learn.related")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {article.related
                .map((r) => articleBySlug[r])
                .filter((r): r is NonNullable<typeof r> => Boolean(r))
                .map((r) => (
                  <Link key={r.slug} to="/learn/$slug" params={{ slug: r.slug }}>
                    <Card className="h-full p-4 transition-colors hover:border-primary/60">
                      <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </ContentShell>
  );
}
