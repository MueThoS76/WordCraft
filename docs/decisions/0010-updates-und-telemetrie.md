# 0010 — Update-Check und Telemetrie: getrennte Mechanismen, unterschiedliche Defaults

**Status:** Entschieden (2026-11-01, im Interview geklärt)

## Kontext

Die Vision fordert ein Admin-Dashboard, das nur anzeigt, ob es eine neue Core-Version gibt und ob Updates für installierte Plugins/Themes vorliegen — ausdrücklich ohne Werbung oder irrelevante Inhalte. Das bedeutet, das self-hostete System muss von sich aus nach außen fragen, was bei sicherheitsfokussierter Software ein Vertrauensproblem sein kann, wenn es nicht transparent gemacht wird.

## Entscheidung

Zwei strikt getrennte Mechanismen mit unterschiedlichen Defaults:

1. **Versions-Check (Updates für Core, Plugins, Themes):** **Standardmäßig aktiv**, vollständig transparent dokumentiert. Fragt ausschließlich "gibt es eine neuere Version als die installierte" gegen die in Core-/Plugin-/Theme-Manifest deklarierte Quelle (Git-Repo-Tag o. ä.) ab. **Sendet dabei keine Daten** außer der reinen Anfrage selbst — keine Telemetrie, keine Nutzungsdaten, keine Identifikatoren. Abschaltbar in den Einstellungen.
2. **Anonyme Installations-Statistik** (Installation erfolgt + Domain): **Standardmäßig aus.** Wird beim Einrichtungsassistenten einmalig explizit per Opt-in abgefragt. Nur wenn zugestimmt, wird diese eine Information übermittelt.

Beides ist technisch getrennt: Der Versions-Check läuft auch dann, wenn die Installations-Statistik abgelehnt wurde — er sendet ja ohnehin nichts Identifizierendes.

## Konsequenzen

- Core, Plugins und Themes deklarieren in ihrem Manifest eine Versionsquelle; ein generischer Update-Checker-Dienst fragt diese periodisch ab (ein Mechanismus für alle drei, nicht drei separate Implementierungen).
- Das Dashboard zeigt ausschließlich Update-Status an — keine Werbeflächen, keine "das könnte dich interessieren"-Inhalte (explizite Anforderung aus der Vision).
- Der Einrichtungsassistent bekommt einen Schritt für die Opt-in-Abfrage der Installations-Statistik, mit klarem Text, was genau (Installation + Domain) übertragen wird.
- Beide Mechanismen werden in der öffentlichen Dokumentation (siehe [0011](0011-dokumentationsumfang.md)) offengelegt, nicht nur im Code.
