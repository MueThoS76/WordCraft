# 0017 — Implementierungsplan: Userverwaltung (Gruppen, Capabilities, 2FA)

**Status:** Entschieden (2026-11-01) — Umsetzung beginnt nach dieser Planung, analog zu [0015](0015-implementierungsplan-meilenstein-1.md).

## Kontext

Erstes Vision-Feature nach Meilenstein 1 ([0015](0015-implementierungsplan-meilenstein-1.md), vollständig abgeschlossen). Die Architektur ist bereits entschieden: [0006-rechte-und-rollenmodell.md](0006-rechte-und-rollenmodell.md) (gruppenbasiert, global, 2FA pro Gruppe erzwingbar) und [0013-minimales-datenmodell.md](0013-minimales-datenmodell.md) (Tabellen `groups`, `capabilities`, `group_capabilities`, `user_groups` existieren bereits im Schema seit Implementierungsschritt 2, bisher ungenutzt).

Aktueller Zustand: Auth kennt nur "eingeloggt oder nicht" (Implementierungsschritt 7). Es gibt genau einen Admin-User ohne Gruppen-/Rechtezuweisung; jeder eingeloggte User kann aktuell alles.

## Entscheidung: die Schritte

1. ~~**Capability-Framework**~~ ✅ — `packages/auth`: Funktionen zum Deklarieren von Capabilities (`ensureCapability`) und zum Prüfen, ob ein User (über seine Gruppen) eine Capability hat (`userHasCapability`). `apps/server`: ein `CapabilityGuard` + `@RequireCapability(id)`-Decorator, analog zum bestehenden `SessionGuard`. _Verifikation:_ Unit-/Integrationstest, der Zugriff mit/ohne passende Gruppenzuordnung prüft. **Erledigt:** zusätzlich minimale Gruppen-Bausteine (`createGroup`, `addUserToGroup`, `grantCapabilityToGroup`) als Grundlage für Schritt 2. `CapabilityGuard` muss explizit zusammen mit `SessionGuard` registriert werden (`@UseGuards(SessionGuard, CapabilityGuard)`) — bewusst **nicht** global, weil Guard-Reihenfolge bei globalen Guards nicht garantiert vor Controller-Guards läuft und `CapabilityGuard` auf das von `SessionGuard` gesetzte `request.userId` angewiesen ist. Integrationstest grün (3 Tests: kein Zugriff vor Zuweisung, Zugriff nach Gruppenzuweisung, Idempotenz von `ensureCapability`).
2. ~~**Core-Capabilities seeden + Administratoren-Gruppe**~~ ✅ — `BootstrapService` deklariert die Core-Capabilities (zunächst: `content.manage`, `users.manage`) und legt eine "Administratoren"-Gruppe mit allen Core-Capabilities an; der Bootstrap-Admin-User wird dieser Gruppe zugewiesen statt capability-los zu bleiben. _Verifikation:_ Frischer Container/DB → Admin kann sich einloggen und hat sofort alle Rechte. **Erledigt:** Capability-IDs zentral in `apps/server/src/auth/core-capabilities.ts` (`CAPABILITY_CONTENT_MANAGE`, `CAPABILITY_USERS_MANAGE`), damit Schritt 3 dieselben Konstanten nutzt statt Strings zu duplizieren. `addUserToGroup` läuft idempotent bei jedem Start — holt auch einen Admin-Account aus einem Deployment von **vor** diesem Schritt nachträglich in die Gruppe (kein manueller Migrationsschritt für bestehende Installationen nötig). Gegen die echte DB verifiziert: Capabilities, Gruppe, Zuordnung und Grants liegen exakt wie erwartet in der Datenbank.
3. **Bestehende Content-Endpunkte absichern** — `ContentItemsController`/`ContentTypesController` bekommen `@RequireCapability("content.manage")` statt nur `SessionGuard`. _Verifikation:_ Eingeloggter User ohne passende Gruppe bekommt 403 statt 200.
4. **Gruppenverwaltung-API** — CRUD für Gruppen, Zuweisung/Entzug von Capabilities, Zuweisung/Entzug von Usern zu Gruppen. Geschützt durch `users.manage`. _Verifikation:_ Integrationstest legt Gruppe an, weist Capability/User zu, prüft `userHasCapability`.
5. **Userverwaltung-API** — Liste/Erstellen/Bearbeiten/Löschen von Usern (ersetzt den fehlenden Registrierungsweg aus Schritt 7). Geschützt durch `users.manage`. _Verifikation:_ Integrationstest: Admin legt User an, der sich danach einloggen kann.
6. **2FA (TOTP)** — eigene Implementierung nach RFC 6238 in `packages/auth` (HMAC-SHA1 über Node-`crypto`, kein externes Paket — konsistent mit der scrypt-Entscheidung aus Schritt 7). Enroll (Secret generieren, manuelle Eingabe in Authenticator-App — **kein QR-Code** in diesem Durchgang, siehe Trade-off unten), Verify, Disable. Login-Flow: zweiter Schritt, wenn der User 2FA aktiviert hat ODER seine Gruppe `require2fa` setzt. _Verifikation:_ Unit-Test mit RFC-6238-Testvektoren; Integrationstest für den zweistufigen Login.
7. **Admin-UI** — neue Seiten in `apps/admin`: Benutzerliste (anlegen, Gruppen zuweisen), Gruppenliste (Capabilities zuweisen, `require2fa`-Toggle), eigener Account-Bereich (2FA aktivieren/deaktivieren). _Verifikation:_ Manuell im Browser — Gruppe anlegen, User zuweisen, 2FA aktivieren, Login mit 2FA durchspielen.
8. **Tests konsolidieren** — Unit-Tests (TOTP), Integrationstests (Capabilities, Gruppen, User-CRUD), E2E-Smoke-Test um den 2FA-Login-Fall erweitern.

## Trade-off: 2FA ohne QR-Code

Ein QR-Code fürs Einscannen des TOTP-Secrets bräuchte eine zusätzliche Abhängigkeit (QR-Code-Generierung) nur für diesen einen Zweck. Für diesen Durchgang reicht die manuelle Secret-Eingabe in die Authenticator-App — funktional vollständig, nur weniger komfortabel. QR-Code-Unterstützung ist eine spätere, unabhängige UI-Verbesserung, keine Architekturfrage.

## Explizit nicht Teil dieses Durchgangs

- Objektbezogene Rechte (schon in [0006](0006-rechte-und-rollenmodell.md) für den Kern ausgeschlossen).
- Granularere Content-Capabilities (z. B. getrennt nach `content.page.publish` vs. `content.page.edit`) — Schritt 2/3 starten bewusst mit einer groben `content.manage`-Capability; feinere Aufteilung ist eine spätere, nicht-brechende Erweiterung (einfach weitere Capability-IDs ergänzen).
- Self-Service-Registrierung (User legen sich selbst an) — Userverwaltung bleibt admin-gesteuert, passend zum CMS-Charakter.

## Konsequenzen

- `packages/auth` wächst um Capability- und TOTP-Logik, bleibt aber weiterhin framework-unabhängig (ADR 0012).
- Jedes künftige Vision-Feature mit Admin-Funktionalität nutzt ab jetzt `@RequireCapability(...)` statt nur `SessionGuard` — erfüllt [0016](0016-ki-mcp-zugaenglichkeit.md): die Capability-Prüfung läuft über die API, nicht nur im UI, und ist damit für KI-Agenten genauso gültig wie für menschliche Admins.
