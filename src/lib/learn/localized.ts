import { useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  ARTICLES,
  GLOSSARY,
  type Article,
  type GlossaryTerm,
} from "@/lib/learn/content";
import es from "@/i18n/learn.es.json";
import fr from "@/i18n/learn.fr.json";
import nl from "@/i18n/learn.nl.json";

type Pack = {
  articles: Record<
    string,
    {
      title: string;
      summary: string;
      category: string;
      sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
    }
  >;
  glossary: Record<string, { term: string; definition: string; group: string }>;
  categories: Record<string, string>;
  groups: Record<string, string>;
};

const PACKS: Record<string, Pack> = {
  es: es as Pack,
  fr: fr as Pack,
  nl: nl as Pack,
};

function localizeArticle(a: Article, pack?: Pack): Article {
  const t = pack?.articles[a.slug];
  if (!t) return a;
  return {
    ...a,
    title: t.title ?? a.title,
    summary: t.summary ?? a.summary,
    category: t.category ?? a.category,
    sections: a.sections.map((s, i) => {
      const ts = t.sections?.[i];
      if (!ts) return s;
      const bullets = s.bullets ? (ts.bullets?.length ? ts.bullets : s.bullets) : undefined;
      return {
        heading: ts.heading ?? s.heading,
        paragraphs: ts.paragraphs?.length ? ts.paragraphs : s.paragraphs,
        ...(bullets ? { bullets } : {}),
      };

    }),
  };
}

function localizeTerm(g: GlossaryTerm, pack?: Pack): GlossaryTerm {
  const t = pack?.glossary[g.term];
  if (!t) return g;
  return {
    term: t.term ?? g.term,
    definition: t.definition ?? g.definition,
    group: t.group ?? g.group,
  };
}

/** Articles and glossary in the active language, falling back to English. */
export function useLearnContent() {
  const { locale } = useLanguage();
  return useMemo(() => {
    const pack = PACKS[locale];
    const articles = ARTICLES.map((a) => localizeArticle(a, pack));
    const bySlug: Record<string, Article> = Object.fromEntries(
      articles.map((a) => [a.slug, a]),
    );
    const glossary = GLOSSARY.map((g) => localizeTerm(g, pack));
    return {
      articles,
      articleBySlug: bySlug,
      categories: Array.from(new Set(articles.map((a) => a.category))),
      glossary,
      glossaryGroups: Array.from(new Set(glossary.map((g) => g.group))),
    };
  }, [locale]);
}
