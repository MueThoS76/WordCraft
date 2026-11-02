export * from "./schema/index.js";
export * from "./client.js";
export * from "./migrate.js";
// Re-export für Caller, die Queries bauen müssen, ohne selbst eine direkte
// drizzle-orm-Abhängigkeit deklarieren zu müssen (ein Dependency-Eigentümer
// für drizzle-orm im ganzen Monorepo).
export { sql, eq, and, gt, desc } from "drizzle-orm";
