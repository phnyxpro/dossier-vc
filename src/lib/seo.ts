/**
 * Shared search / answer-engine constants and helpers.
 *
 * SEO  — classic search crawlers (canonical, sitemap, metadata)
 * AEO  — answer engines (structured data that states facts plainly)
 * GEO  — generative engines (llms.txt, markdown-friendly, explicit crawler rules)
 */

export const SITE_URL = "https://dossier.ventureble.com";

export const ORG_NAME = "Ventureble Ltd";
export const PRODUCT_NAME = "Dossier by Ventureble";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical link + og:url pair for a public leaf route. */
export function canonicalTags(path: string) {
  const url = absoluteUrl(path);
  return {
    meta: { property: "og:url", content: url },
    link: { rel: "canonical", href: url },
    url,
  };
}

export function jsonLd(data: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

/** Breadcrumb trail; pass items in order, root first. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: ORG_NAME,
  alternateName: "Ventureble",
  url: SITE_URL,
  description:
    "Ventureble builds capital-readiness tooling for micro, small and medium enterprises in the Caribbean.",
  areaServed: [
    { "@type": "Country", name: "Trinidad and Tobago" },
    { "@type": "Country", name: "Barbados" },
    { "@type": "Country", name: "Jamaica" },
    { "@type": "Country", name: "Guyana" },
    { "@type": "Country", name: "Suriname" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Port of Spain",
    addressCountry: "TT",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@ventureble.com",
      availableLanguage: ["English", "Spanish", "French", "Dutch"],
    },
  ],
};

export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: PRODUCT_NAME,
  url: SITE_URL,
  inLanguage: ["en", "es", "fr", "nl"],
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: PRODUCT_NAME,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web browser, iOS, Android (progressive web app)",
  url: SITE_URL,
  description:
    "Dossier helps Caribbean MSMEs organise financing information, close capital-readiness gaps and produce a lender-ready financing dossier for banks, credit unions and development finance institutions.",
  featureList: [
    "Financing request setup for loans, lines of credit, asset finance and equity",
    "Document collection with AI extraction of statements and registration certificates",
    "Capital readiness scoring and gap review",
    "Lender-ready dossier generation",
    "Capital provider review portal",
  ],
  inLanguage: ["en", "es", "fr", "nl"],
  publisher: { "@id": `${SITE_URL}/#organization` },
};
