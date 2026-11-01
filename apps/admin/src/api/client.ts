import type { BlockDocument } from "@presscraft/blocks";
import type { ContentItem, ContentType } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      // Nur setzen, wenn tatsächlich ein Body mitgeschickt wird — sonst
      // lehnt der Server einen leeren Body mit diesem Content-Type ab
      // (z. B. bei publish/unpublish/logout ohne Payload).
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.error?.message ?? response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<{ success: true }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return request<{ success: true }>("/auth/logout", { method: "POST" });
  },
  listPages() {
    return request<ContentItem[]>("/content/page");
  },
  getPage(id: string) {
    return request<ContentItem>(`/content/page/${id}`);
  },
  createPage(input: { slug: string; title: string }) {
    return request<ContentItem>("/content/page", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updatePage(id: string, input: { title?: string; slug?: string; blockBody?: BlockDocument }) {
    return request<ContentItem>(`/content/page/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  publishPage(id: string) {
    return request<ContentItem>(`/content/page/${id}/publish`, { method: "POST" });
  },
  deletePage(id: string) {
    return request<{ success: true }>(`/content/page/${id}`, { method: "DELETE" });
  },
  listContentTypes() {
    return request<ContentType[]>("/content-types");
  },
};
