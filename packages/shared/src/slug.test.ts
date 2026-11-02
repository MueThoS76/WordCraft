import { describe, expect, it } from "vitest";
import { slugify } from "./slug.js";

describe("slugify", () => {
  it("wandelt Titel in URL-taugliche Slugs um", () => {
    expect(slugify("Hallo Welt")).toBe("hallo-welt");
    expect(slugify("Größe & Übung: Äpfel!")).toBe("groesse-uebung-aepfel");
    expect(slugify("  --Café  au lait--  ")).toBe("cafe-au-lait");
    expect(slugify("***")).toBe("");
  });
});
