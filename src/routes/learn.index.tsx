import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Clock, Search } from "@/lib/icons";
import { AppShell } from "@/components/app-shell";
import { Badge, Card, Input, SectionTitle } from "@/components/ui/primitives";
import { useLearnContent } from "@/lib/learn/localized";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Knowledge Base & Glossary — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Guides on types of capital, facility structures, collateral, coverage ratios and lender documentation, plus a glossary of financing terms for Caribbean MSMEs.",
      },
      { property: "og:title", content: "Knowledge Base & Glossary — Dossier by Ventureble" },
      {
        property: "og:description",
        content: "Plain-language guides and a financing glossary for Caribbean business owners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnIndex,
});

function LearnIndex() {
  const { t } = useLanguage();
  const {
    articles: ALL_ARTICLES,
    categories: ARTICLE_CATEGORIES,
    glossary: ALL_TERMS,
    glossaryGroups: GLOSSARY_GROUPS,
  } = useLearnContent();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const articles = useMemo(
    () =>
      !query
        ? ALL_ARTICLES
        : ALL_ARTICLES.filter((a) =>
            [a.title, a.summary, a.category].join(" ").toLowerCase().includes(query),
          ),
    [query, ALL_ARTICLES],
  );

  const terms = useMemo(
    () =>
      !query
        ? ALL_TERMS
        : ALL_TERMS.filter((g) => `${g.term} ${g.definition}`.toLowerCase().includes(query)),
    [query],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <SectionTitle>{t("learn.title")}</SectionTitle>
        <Card className="p-6">
          <p className="max-w-2xl text-sm text-muted-foreground">
{t("learn.intro")}
          </p>
          <div className="relative mt-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("learn.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("learn.search")}
            />
          </div>
        </Card>

        <div className="mt-8 space-y-8">
          {ARTICLE_CATEGORIES.map((cat) => {
            const list = articles.filter((a) => a.category === cat);
            if (!list.length) return null;
            return (
              <section key={cat}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {list.map((a) => (
                    <Link key={a.slug} to="/learn/$slug" params={{ slug: a.slug }}>
                      <Card className="h-full p-5 transition-colors hover:border-primary/60">
                        <div className="flex items-start gap-3">
                          <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                          <div>
                            <h3 className="font-semibold text-foreground">{a.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
                            <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3.5" /> {a.readMinutes} {t("learn.readMin")}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("learn.noGuides")} “{q}”.</p>
          ) : null}
        </div>

        <div id="glossary" className="mt-12">
          <SectionTitle>{t("learn.glossary")}</SectionTitle>
          <div className="space-y-6">
            {GLOSSARY_GROUPS.map((group) => {
              const list = terms.filter((t) => t.group === group);
              if (!list.length) return null;
              return (
                <Card key={group} className="p-5">
                  <Badge tone="default">{group}</Badge>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {list.map((t) => (
                      <div key={t.term}>
                        <dt className="text-sm font-semibold text-foreground">{t.term}</dt>
                        <dd className="mt-1 text-sm text-muted-foreground">{t.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              );
            })}
            {terms.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("learn.noTerms")} “{q}”.</p>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
