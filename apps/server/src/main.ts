import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { runMigrations } from "@presscraft/database";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";

try {
  process.loadEnvFile();
} catch {
  // Keine .env-Datei vorhanden — Umgebungsvariablen kommen z. B. von Docker Compose.
}

async function bootstrap(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }
  // Idempotent — macht einen frischen Self-Hosting-Container lauffähig,
  // ohne dass ein manueller Migrationsschritt nötig wäre (ADR 0015, Schritt 10).
  await runMigrations(connectionString);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.register(fastifyCookie);
  // Cookie-basierte Session-Auth braucht CORS mit konkretem Origin statt "*"
  // (Browser schicken Credentials bei Wildcard-Origin nicht mit).
  app.enableCors({
    origin: process.env.ADMIN_ORIGIN ?? "http://localhost:4322",
    credentials: true,
  });

  // apps/admin wird im Self-Hosting-Setup als statischer Build mitgeliefert
  // (ADR 0015, Schritt 10) — im lokalen Dev-Modus (eigener Vite-Dev-Server)
  // existiert dieser Ordner nicht, dann wird einfach nichts registriert.
  const adminStaticDir =
    process.env.ADMIN_STATIC_DIR ?? path.resolve(import.meta.dirname, "../../admin/dist");
  if (fs.existsSync(adminStaticDir)) {
    await app.register(fastifyStatic, {
      root: adminStaticDir,
      prefix: "/admin",
      redirect: true,
    });
  }

  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
