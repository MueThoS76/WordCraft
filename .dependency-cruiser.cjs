/**
 * Technische Durchsetzung der Paket-Abhängigkeitsregeln aus
 * docs/decisions/0012-monorepo-struktur.md.
 *
 * Dies ist ein erster, bewusst konservativer Satz von Regeln, der die
 * wichtigsten im Brief/ADR benannten Invarianten abdeckt. Er wird erweitert,
 * sobald in späteren Implementierungsschritten echte Imports zwischen den
 * Paketen entstehen (siehe ADR 0015).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-core-depends-on-ui",
      comment:
        "Core-Domänenpakete (core, database, content, auth, media) dürfen nicht von Theme/Editor/Renderer " +
        "oder von einer App abhängen (ADR 0012: 'CMS-Core darf nicht unmittelbar von einem bestimmten Theme " +
        "oder Editor abhängen').",
      severity: "error",
      from: { path: "^packages/(core|database|content|auth|media)/" },
      to: { path: "^(packages/(editor|renderer|theme-sdk)/|apps/)" },
    },
    {
      name: "no-plugin-sdk-raw-data-access",
      comment:
        "plugin-sdk darf keinen direkten Zugriff auf Datenbank/Auth/Content/Media haben — nur über " +
        "capability-geprüfte Funktionen des Cores (ADR 0005, ADR 0012).",
      severity: "error",
      from: { path: "^packages/plugin-sdk/" },
      to: { path: "^packages/(database|auth|content|media)/" },
    },
    {
      name: "apps-must-not-import-each-other",
      comment:
        "apps/server, apps/admin und apps/web sprechen nur über HTTP miteinander, nie per direktem " +
        "Import (ADR 0012).",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
    {
      name: "no-circular",
      comment: "Keine zirkulären Abhängigkeiten zwischen Paketen.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
