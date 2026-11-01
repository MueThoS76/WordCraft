import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Wendet ausstehende Migrationen an — idempotent (drizzle führt Buch in
 * __drizzle_migrations). Wird von apps/server beim Start aufgerufen, damit
 * ein frischer Self-Hosting-Container ohne manuellen Migrationsschritt
 * startet (ADR 0015, Schritt 10). Nutzt eine eigene, kurzlebige
 * Single-Connection statt der App-weiten Datenbankverbindung, wie von
 * drizzle-orm für Migrationen empfohlen.
 */
export async function runMigrations(connectionString: string): Promise<void> {
  const migrationClient = postgres(connectionString, { max: 1 });
  try {
    const db = drizzle(migrationClient);
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
    });
  } finally {
    await migrationClient.end();
  }
}
