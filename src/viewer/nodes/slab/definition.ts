import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { SlabNode } from "../../../core/schema/slab";
import { buildSlabGeometry } from "../column/geometry";

export const slabDefinition: NodeDefinition<SlabNode> = {
  kind: 'slab',
  geometry: buildSlabGeometry,
}