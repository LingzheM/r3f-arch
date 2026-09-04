import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { CeilingNode } from "../../../core/schema/ceiling";
import { buildCeilingGeometry } from "./geometry";

export const ceilingDefinition: NodeDefinition<CeilingNode> = {
  kind: 'ceiling',
  geometry: buildCeilingGeometry,
}