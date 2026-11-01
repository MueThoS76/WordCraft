# 0006 — Rechte- und Rollenmodell: gruppenbasiert, global, mit erzwingbarem 2FA

**Status:** Entschieden (2026-11-01, im Interview geklärt)

## Kontext

Die Produktvision fordert Userverwaltung mit "Usern, Gruppen und Einzelrechten", bei der System und Plugins deklarieren, welche Rechte sie bereitstellen, und diese Rechte Gruppen zugewiesen werden. Im Gespräch wurden zwei Unklarheiten aufgelöst: die Granularität der Rechte (global vs. objektbezogen) und der Zuweisungsweg (nur über Gruppen vs. zusätzliche Einzelrechte am User).

## Entscheidung

- **Capabilities statt Rollen-Strings**: Der Core und jedes Plugin deklarieren die Capabilities, die sie bereitstellen (z. B. `content.page.edit`, `plugin.install`, `settings.write`).
- **Zuweisung ausschließlich über Gruppen**: Ein User hat genau die Capabilities der Gruppe(n), in denen er Mitglied ist. Es gibt **keine** Einzelrechte direkt am User vorbei.
- **Global, nicht objektbezogen**: Eine Capability gilt für einen Inhaltstyp/Bereich insgesamt, nicht pro einzelnem Inhalts-Objekt (keine Access-Control-Liste pro Seite). Objektbezogene Einschränkungen sind kein Kernfeature, aber als erweiterbarer Hook angelegt, den ein Plugin später ergänzen kann (nach dem Vorbild von WordPress' `current_user_can()`-Filtern).
- **2FA optional, aber pro Gruppe erzwingbar**: Jeder User kann 2FA (TOTP) freiwillig aktivieren. Eine Gruppe kann zusätzlich als "2FA-Pflicht" markiert werden — Mitglieder dieser Gruppe können sich ohne aktiviertes 2FA nicht einloggen. Für Administratoren-Gruppen ist das die empfohlene Konfiguration.

## Konsequenzen

- Datenmodell braucht: `users`, `groups`, `user_groups` (n:m), `capabilities` (von Core/Plugins deklariert), `group_capabilities` (n:m) — keine `user_capabilities`-Tabelle.
- `groups` bekommt ein Flag `require_2fa`; der Login-Flow prüft dieses Flag gegen die Gruppen des Users.
- User-Datenmodell braucht Felder für TOTP-Secret und Recovery-Codes.
- Das Permission-Check-System wird als erweiterbarer Hook gebaut (Plugins können zusätzliche, feinere Prüfungen registrieren), auch wenn Kern-Checks rein gruppenbasiert/global bleiben.
