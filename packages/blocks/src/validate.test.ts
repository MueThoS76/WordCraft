import { describe, expect, it } from "vitest";
import type { BlockDocument } from "./document.js";
import { createCoreBlockRegistry } from "./core-registry.js";
import { UnknownBlockTypeError, validateBlockDocument } from "./validate.js";

describe("validateBlockDocument", () => {
  const registry = createCoreBlockRegistry();

  it("accepts a valid document using the three core block types", () => {
    const document: BlockDocument = {
      schemaVersion: 1,
      blocks: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          type: "core/heading",
          attributes: { text: "Willkommen", level: 1 },
        },
        {
          id: "123e4567-e89b-12d3-a456-426614174001",
          type: "core/paragraph",
          attributes: { text: "Ein Absatz." },
        },
        {
          id: "123e4567-e89b-12d3-a456-426614174002",
          type: "core/image",
          attributes: { src: "https://example.com/bild.png", alt: "Beispielbild" },
        },
      ],
    };

    expect(() => validateBlockDocument(document, registry)).not.toThrow();
  });

  it("rejects a block of an unregistered type", () => {
    const document = {
      schemaVersion: 1,
      blocks: [
        { id: "123e4567-e89b-12d3-a456-426614174003", type: "myplugin/unknown", attributes: {} },
      ],
    };

    expect(() => validateBlockDocument(document, registry)).toThrow(UnknownBlockTypeError);
  });

  it("rejects attributes that don't match the block type's schema", () => {
    const document = {
      schemaVersion: 1,
      blocks: [
        {
          id: "123e4567-e89b-12d3-a456-426614174004",
          type: "core/heading",
          // "level" fehlt, ist aber Pflicht laut headingAttributesSchema.
          attributes: { text: "Ohne Level" },
        },
      ],
    };

    expect(() => validateBlockDocument(document, registry)).toThrow();
  });

  it("rejects children on a block type that does not allow them", () => {
    const document = {
      schemaVersion: 1,
      blocks: [
        {
          id: "123e4567-e89b-12d3-a456-426614174005",
          type: "core/paragraph",
          attributes: { text: "Absatz mit Kind" },
          children: [
            {
              id: "123e4567-e89b-12d3-a456-426614174006",
              type: "core/paragraph",
              attributes: { text: "Kind-Absatz" },
            },
          ],
        },
      ],
    };

    expect(() => validateBlockDocument(document, registry)).toThrow();
  });

  it("rejects a structurally invalid document", () => {
    expect(() => validateBlockDocument({ blocks: [] }, registry)).toThrow();
  });

  it("validiert die neuen Block-Typen und lehnt unsichere URLs ab", () => {
    const ok: BlockDocument = {
      schemaVersion: 1,
      blocks: [
        {
          id: "123e4567-e89b-12d3-a456-426614174010",
          type: "core/list",
          attributes: { ordered: true, items: ["eins", "zwei"] },
        },
        {
          id: "123e4567-e89b-12d3-a456-426614174011",
          type: "core/quote",
          attributes: { text: "Zitat", cite: "Jemand" },
        },
        { id: "123e4567-e89b-12d3-a456-426614174012", type: "core/divider", attributes: {} },
        {
          id: "123e4567-e89b-12d3-a456-426614174013",
          type: "core/button",
          attributes: { label: "Los", url: "/kontakt", style: "outline" },
        },
        {
          id: "123e4567-e89b-12d3-a456-426614174014",
          type: "core/image",
          attributes: { src: "", alt: "" },
        },
      ],
    };
    expect(() => validateBlockDocument(ok, registry)).not.toThrow();

    for (const url of ["javascript:alert(1)", "data:text/html,x", "//evil.example"]) {
      const bad = {
        schemaVersion: 1,
        blocks: [
          {
            id: "123e4567-e89b-12d3-a456-426614174015",
            type: "core/button",
            attributes: { label: "x", url },
          },
        ],
      };
      expect(() => validateBlockDocument(bad, registry)).toThrow();
    }
  });
});
