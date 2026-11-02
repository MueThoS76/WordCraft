import type { APIRoute } from "astro";
import { apiBaseUrl } from "../lib/api";
import { siteOrigin, xmlEscape } from "../lib/xml";

interface SitemapData {
  pages: { slug: string; updatedAt: string }[];
  posts: { slug: string; updatedAt: string }[];
  categories: { slug: string }[];
}

export const GET: APIRoute = async ({ url }) => {
  const origin = siteOrigin(url);
  const response = await fetch(`${apiBaseUrl}/public/sitemap`);
  const data: SitemapData = response.ok
    ? ((await response.json()) as SitemapData)
    : { pages: [], posts: [], categories: [] };

  const entry = (path: string, lastModified?: string) =>
    `<url><loc>${xmlEscape(origin + path)}</loc>` +
    (lastModified ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : "") +
    "</url>";

  const urls = [
    entry("/"),
    entry("/blog"),
    ...data.categories.map((category) => entry(`/kategorie/${category.slug}`)),
    ...data.pages.map((page) => entry(`/${page.slug}`, page.updatedAt)),
    ...data.posts.map((post) => entry(`/blog/${post.slug}`, post.updatedAt)),
  ].join("");

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>' +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
