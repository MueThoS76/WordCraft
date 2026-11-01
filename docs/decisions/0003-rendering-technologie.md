# 0003 — Rendering-Technologie für die öffentliche Seite: Astro

**Status:** Entschieden (2026-11-01)

## Kontext

Das Initial Brief ließ die Rendering-Technologie bewusst offen. Die Anforderung aus dem Gespräch: "schnell, cool, sicher" — konkret gute Core-Web-Vitals/Lighthouse-Werte, ohne die im Brief geforderte gemeinsame Rendering-Basis zwischen Editor und öffentlicher Website zu verlieren.

Eine CMS-Seite ist zu einem großen Teil statischer Content, kein interaktives Dashboard — anders als das Admin-Interface, das als React-SPA entschieden ist.

## Entscheidung

**Astro** rendert die öffentliche Website.

- Standardmäßig wird kein JavaScript an den Client geschickt — nur HTML/CSS.
- Einzelne Blocks, die wirklich Interaktivität brauchen (z. B. ein Formular-Block, ein Kommentarbereich), werden als **React-Islands** eingebunden — gezielt, nicht die ganze Seite.
- Die React-Komponenten, die im Editor für die Live-Vorschau genutzt werden, werden so geschnitten, dass sie sowohl im Editor (voll interaktiv) als auch als Astro-Island (nur wo nötig) wiederverwendbar sind. Das erfüllt die Brief-Vorgabe eines gemeinsamen Komponenten-/Rendering-Vertrags zwischen Editor und Website.

## Alternative geprüft: Next.js (SSR/ISR)

Next.js wäre technisch ebenfalls möglich und liegt näher am Admin-Stack (beides React). Verworfen, weil:

- Next.js liefert im Vergleich zu Astro standardmäßig mehr JavaScript an den Client, ohne dass eine überwiegend statische CMS-Seite davon profitiert.
- Next.js bringt mehr framework-eigene Konzepte mit (App Router, Vercel-nahe Deployment-Annahmen), die für ein self-hostbares Open-Source-CMS nicht zwingend von Vorteil sind.

## Konsequenzen

- `packages/renderer` liefert den gemeinsamen Block-Rendering-Vertrag; `apps/web` wird als Astro-App aufgesetzt, `apps/admin` bleibt React-SPA.
- Caching/ISR-Strategie (Abschnitt 8 im Brief) wird auf Astro-Basis geplant (Astro unterstützt sowohl statisches Prerendering als auch On-Demand-Rendering über Adapter) — Details folgen in einer eigenen Performance-/Caching-ADR, sobald das Datenmodell steht.
- Plugins, die eigene Blocks registrieren, müssen künftig sowohl eine Editor- als auch eine Astro/Island-Renderfunktion mitliefern — das wird Teil des `plugin-sdk`-Vertrags.
