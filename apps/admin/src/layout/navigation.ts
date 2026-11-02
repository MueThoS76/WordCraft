/**
 * Zentrale Definition der Admin-Navigation. Später können Plugins hier
 * eigene Einträge beisteuern (ADR 0005, "Admin-UI-Erweiterungen") — deshalb
 * ist die Navigation reine Daten und keine hart verdrahtete JSX-Struktur.
 */
export type NavItem = {
  /** Eindeutiger Schlüssel, auch für Tests. */
  key: string;
  label: string;
  /** Pfad relativ zur Router-Basis. */
  to: string;
  /** Kurzes Symbol (Emoji), bis ein Icon-Set eingeführt wird. */
  icon: string;
};

export type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    key: "start",
    label: "Start",
    items: [{ key: "dashboard", label: "Dashboard", to: "/dashboard", icon: "🏠" }],
  },
  {
    key: "content",
    label: "Inhalt",
    items: [
      { key: "pages", label: "Seiten", to: "/pages", icon: "📄" },
      { key: "posts", label: "Beiträge", to: "/posts", icon: "📝" },
      { key: "categories", label: "Kategorien", to: "/categories", icon: "🏷️" },
      { key: "media", label: "Medien", to: "/media", icon: "🖼️" },
      { key: "menu", label: "Menü", to: "/menu", icon: "🧭" },
    ],
  },
  {
    key: "users",
    label: "Benutzer",
    items: [
      { key: "users", label: "Benutzer", to: "/users", icon: "👤" },
      { key: "groups", label: "Gruppen", to: "/groups", icon: "👥" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { key: "settings", label: "Einstellungen", to: "/settings", icon: "🛠️" },
      { key: "account", label: "Mein Account", to: "/account", icon: "⚙️" },
    ],
  },
];
