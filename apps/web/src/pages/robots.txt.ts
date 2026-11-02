import type { APIRoute } from "astro";
import { siteOrigin } from "../lib/xml";

export const GET: APIRoute = ({ url }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin(url)}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
