import type { APIRoute } from "astro";
import { fetchPosts, fetchSettings } from "../lib/api";
import { siteOrigin, xmlEscape } from "../lib/xml";

export const GET: APIRoute = async ({ url }) => {
  const origin = siteOrigin(url);
  const [settings, posts] = await Promise.all([fetchSettings(), fetchPosts({ page: 1 })]);

  const items = posts.items
    .map((post) => {
      const link = `${origin}/blog/${post.slug}`;
      return [
        "<item>",
        `<title>${xmlEscape(post.title)}</title>`,
        `<link>${xmlEscape(link)}</link>`,
        `<guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : "",
        post.excerpt ? `<description>${xmlEscape(post.excerpt)}</description>` : "",
        ...post.categories.map((category) => `<category>${xmlEscape(category.name)}</category>`),
        "</item>",
      ].join("");
    })
    .join("");

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0"><channel>' +
    `<title>${xmlEscape(settings.siteTitle)}</title>` +
    `<link>${xmlEscape(origin)}/</link>` +
    `<description>${xmlEscape(settings.tagline || settings.siteTitle)}</description>` +
    "<language>de</language>" +
    items +
    "</channel></rss>";

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
