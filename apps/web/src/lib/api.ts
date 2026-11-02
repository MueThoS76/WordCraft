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
