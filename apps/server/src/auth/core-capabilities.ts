/**
 * Core-Capabilities, die apps/server selbst bereitstellt (ADR 0006:
 * "providedBy" = "core"). Künftige Plugins deklarieren ihre eigenen über
 * denselben Mechanismus (ensureCapability aus @presscraft/auth).
 *
 * Bewusst grob geschnitten für Implementierungsschritt 2–3 aus ADR 0017 —
 * feinere Aufteilung (z. B. getrennt nach edit/publish) ist eine spätere,
 * nicht-brechende Erweiterung.
 */
export const CAPABILITY_CONTENT_MANAGE = "content.manage";
export const CAPABILITY_USERS_MANAGE = "users.manage";
export const CAPABILITY_MEDIA_MANAGE = "media.manage";
export const CAPABILITY_SETTINGS_MANAGE = "settings.manage";

export const CORE_CAPABILITIES = [
  {
    id: CAPABILITY_CONTENT_MANAGE,
    description: "Inhalte anlegen, bearbeiten, veröffentlichen, löschen.",
  },
  {
    id: CAPABILITY_USERS_MANAGE,
    description: "User und Gruppen verwalten.",
  },
  {
    id: CAPABILITY_MEDIA_MANAGE,
    description: "Medien hochladen, beschreiben und löschen.",
  },
  {
    id: CAPABILITY_SETTINGS_MANAGE,
    description: "Website-Einstellungen und Navigationsmenü ändern.",
  },
];

export const ADMIN_GROUP_NAME = "Administratoren";
