import type { BlockDocument } from "@presscraft/blocks";
import type {
  AppUser,
  Capability,
  ContentItem,
  ContentType,
  Group,
  GroupDetail,
  MediaItem,
  Me,
} from "./types";

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
      // Bei FormData (Upload) setzt der Browser den Content-Type samt
      // Boundary selbst — ein eigener Header würde den Upload zerstören.
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
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
    return request<{ success: true; requiresTwoFactor: boolean }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  loginTwoFactor(code: string) {
    return request<{ success: true }>("/auth/login/2fa", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
  logout() {
    return request<{ success: true }>("/auth/logout", { method: "POST" });
  },
  me() {
    return request<Me>("/me");
  },
  enrollTwoFactor() {
    return request<{ secret: string; otpauthUri: string }>("/me/2fa/enroll", { method: "POST" });
  },
  confirmTwoFactor(code: string) {
    return request<{ success: true }>("/me/2fa/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
  disableTwoFactor(code: string) {
    return request<{ success: true }>("/me/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
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

  listUsers() {
    return request<AppUser[]>("/users");
  },
  createUser(input: { email: string; password: string }) {
    return request<AppUser>("/users", { method: "POST", body: JSON.stringify(input) });
  },
  deleteUser(id: string) {
    return request<{ success: true }>(`/users/${id}`, { method: "DELETE" });
  },

  listGroups() {
    return request<Group[]>("/groups");
  },
  getGroup(id: string) {
    return request<GroupDetail>(`/groups/${id}`);
  },
  createGroup(input: { name: string; require2fa?: boolean }) {
    return request<Group>("/groups", { method: "POST", body: JSON.stringify(input) });
  },
  updateGroup(id: string, input: { name?: string; require2fa?: boolean }) {
    return request<Group>(`/groups/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deleteGroup(id: string) {
    return request<{ success: true }>(`/groups/${id}`, { method: "DELETE" });
  },
  grantCapability(groupId: string, capabilityId: string) {
    return request<{ success: true }>(`/groups/${groupId}/capabilities`, {
      method: "POST",
      body: JSON.stringify({ capabilityId }),
    });
  },
  revokeCapability(groupId: string, capabilityId: string) {
    return request<{ success: true }>(`/groups/${groupId}/capabilities/${capabilityId}`, {
      method: "DELETE",
    });
  },
  addGroupMember(groupId: string, userId: string) {
    return request<{ success: true }>(`/groups/${groupId}/users`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  removeGroupMember(groupId: string, userId: string) {
    return request<{ success: true }>(`/groups/${groupId}/users/${userId}`, { method: "DELETE" });
  },
  listMedia() {
    return request<MediaItem[]>("/media");
  },
  uploadMedia(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return request<MediaItem>("/media", { method: "POST", body: formData });
  },
  updateMediaAltText(id: string, altText: string) {
    return request<MediaItem>(`/media/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ altText }),
    });
  },
  deleteMedia(id: string) {
    return request<{ success: true }>(`/media/${id}`, { method: "DELETE" });
  },
  listCapabilities() {
    return request<Capability[]>("/capabilities");
  },
};
