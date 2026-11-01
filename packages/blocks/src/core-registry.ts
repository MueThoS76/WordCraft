import { coreBlockTypes } from "./core-blocks.js";
import { BlockTypeRegistry } from "./registry.js";

export function createCoreBlockRegistry(): BlockTypeRegistry {
  const registry = new BlockTypeRegistry();
  for (const blockType of coreBlockTypes) {
    registry.register(blockType);
  }
  return registry;
}
