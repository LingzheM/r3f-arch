import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { LevelNode } from "../../../core/schema/level";
import { LevelRenderer } from "./renderer";

export const levelDefinition: NodeDefinition<LevelNode> = {
  kind: 'level',
  selectable: false,
  renderer: LevelRenderer,
}