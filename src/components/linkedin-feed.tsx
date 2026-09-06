import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Linkedin } from "@/lib/icons";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useLanguage } from "@/lib/i18n";
import { getLinkedInPosts } from "@/lib/linkedin.functions";

const COMPANY_URL = "https://www.linkedin.com/company/ventureble/";

/**
 * Dashboard row showing the latest Ventureble LinkedIn posts.
 * Falls back to a simple link card if the feed can't be read.
 */
export function LinkedInFeed() {
  const { t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["linkedin-posts"],
    queryFn: () => getLinkedInPosts(),
    staleTime: 15 * 60 * 1000,
  });
  const posts = data?.posts ?? [];

  return (
    <section aria-labelledby="linkedin-feed-heading" className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <SectionTitle>
          <span id="linkedin-feed-heading" className="inline-flex items-center gap-2">
            <Linkedin className="size-4 text-primary" />
            {t("dash.newsTitle")}
          </span>
        </SectionTitle>
        <a
          href={COMPANY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("dash.newsFollow")} <ExternalLink className="size-3.5" />
        </a>
      </div>

      {posts.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t("dash.newsEmpty")}</p>
          <a
            href={COMPANY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("dash.newsVisit")} <ArrowRight className="size-3.5" />
          </a>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {posts.map((post, i) => (
            <a
              key={post.url || i}
              href={post.url || COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-primary/50">
                {post.image ? (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
                    <img
                      src={post.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-5">
                  <p className="line-clamp-4 flex-1 text-sm text-foreground/90">
                    {post.text}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.timeAgo}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      {t("dash.newsRead")} <ArrowRight className="size-3" />
                    </span>
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
