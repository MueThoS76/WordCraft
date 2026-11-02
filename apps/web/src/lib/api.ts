export const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  categories: CategorySummary[];
}

export interface PostList {
  items: PostSummary[];
  total: number;
}

export interface PublicCategory extends CategorySummary {
  description: string;
  itemCount: number;
}

export const POSTS_PER_PAGE = 10;

export async function fetchPosts(options: { category?: string; page: number }): Promise<PostList> {
  const params = new URLSearchParams({
    limit: String(POSTS_PER_PAGE),
    offset: String((options.page - 1) * POSTS_PER_PAGE),
  });
  if (options.category) {
    params.set("category", options.category);
  }
  const response = await fetch(`${apiBaseUrl}/public/posts?${params}`);
  if (!response.ok) {
    return { items: [], total: 0 };
  }
  return (await response.json()) as PostList;
}

export async function fetchCategories(): Promise<PublicCategory[]> {
  const response = await fetch(`${apiBaseUrl}/public/categories`);
  return response.ok ? ((await response.json()) as PublicCategory[]) : [];
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export interface NavigationItem {
  label: string;
  url: string;
}

export interface SiteSettings {
  siteTitle: string;
  tagline: string;
  homepage: string;
  navigation: NavigationItem[];
  footerText: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "PressCraft",
  tagline: "",
  homepage: "blog",
  navigation: [
    { label: "Start", url: "/" },
    { label: "Blog", url: "/blog" },
  ],
  footerText: "",
};

/** Zweite Verteidigungslinie: nur relative Pfade und http(s)-Links ins Menü lassen. */
export function isSafeUrl(url: string): boolean {
  if (url.startsWith("//")) {
    return false;
  }
  return /^\/[^\s]*$/.test(url) || /^https?:\/\/[^\s]+$/i.test(url);
}

export async function fetchSettings(): Promise<SiteSettings> {
  try {
    const response = await fetch(`${apiBaseUrl}/public/settings`);
    if (!response.ok) {
      return DEFAULT_SETTINGS;
    }
    const settings = (await response.json()) as SiteSettings;
    return { ...settings, navigation: settings.navigation.filter((item) => isSafeUrl(item.url)) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
