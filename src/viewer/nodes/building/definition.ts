import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { BuildingNode } from "../../../core/schema/building";

export const buildingDefinition: NodeDefinition<BuildingNode> = {
  kind: 'building',
  selectable: false,
}