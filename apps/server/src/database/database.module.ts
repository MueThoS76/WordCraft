import { Module } from "@nestjs/common";
import { createDb, type Database } from "@presscraft/database";

export const DATABASE_CONNECTION = "DATABASE_CONNECTION";

/**
 * Stellt die Drizzle-Connection als DI-Provider bereit, damit Module sie
 * per @Inject(DATABASE_CONNECTION) injizieren können, statt eigene
 * Verbindungen aufzubauen (ADR 0012: apps/server ist die einzige Laufzeit
 * mit DB-Zugriff).
 */
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (): Database => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error("DATABASE_URL ist nicht gesetzt.");
        }
        return createDb(connectionString);
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
