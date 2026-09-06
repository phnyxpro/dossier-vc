import { createServerFn } from "@tanstack/react-start";

export type LinkedInPost = {
  text: string;
  url: string;
  timeAgo: string;
  image: string | null;
};

const COMPANY_PAGE = "https://www.linkedin.com/company/ventureble/";
const CACHE_TTL_MS = 15 * 60 * 1000;

let cache: { at: number; posts: LinkedInPost[] } | null = null;

/**
 * Reads the public Ventureble LinkedIn company page and returns the latest
 * posts. LinkedIn has no public feed API, so we parse the guest-rendered
 * company page server-side. Results are cached briefly; failures return an
 * empty list so the UI can fall back to a plain link.
 */
export const getLinkedInPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ posts: LinkedInPost[] }> => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return { posts: cache.posts };
    }
    try {
      const res = await fetch(COMPANY_PAGE, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { posts: cache?.posts ?? [] };
      const html = await res.text();
      const { load } = await import("cheerio");
      const $ = load(html);

      const posts: LinkedInPost[] = [];
      $("ul.updates__list > li").each((_, li) => {
        if (posts.length >= 4) return;
        const card = $(li).find("article.main-feed-activity-card").first();
        const scope = card.length ? card : $(li);
        const commentary = scope
          .find('[data-test-id="main-feed-activity-card__commentary"]')
          .first();
        const text = commentary.text().replace(/\s+/g, " ").trim();
        if (!text) return;

        const linkEl = scope
          .find('a[href*="/posts/ventureble"]')
          .first();
        const href = linkEl.attr("href") ?? "";
        const url = href.startsWith("http") ? href.split("?")[0] : "";

        const timeAgo = scope.find("time").first().text().replace(/Edited\s*$/i, "").trim();

        let image: string | null = null;
        scope.find("img").each((_, img) => {
          if (image) return;
          const src =
            $(img).attr("data-delayed-url") ?? $(img).attr("src") ?? "";
          if (src && !src.includes("company-logo") && !src.includes("data:")) {
            image = src.replace(/&amp;/g, "&");
          }
        });
        image = image as string | null;

        posts.push({ text, url, timeAgo, image });
      });

      if (posts.length) cache = { at: Date.now(), posts };
      return { posts };
    } catch (err) {
      console.error("LinkedIn fetch failed:", err);
      return { posts: cache?.posts ?? [] };
    }
  },
);
