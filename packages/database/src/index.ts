export * from "./schema/index.js";
export * from "./client.js";
// Re-export für Caller, die rohe SQL-Fragmente bauen müssen (z. B. Health-Checks),
// ohne selbst eine direkte drizzle-orm-Abhängigkeit deklarieren zu müssen.
export { sql } from "drizzle-orm";
