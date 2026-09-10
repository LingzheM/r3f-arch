import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { ColumnNode } from "../../../core/schema/column";
import { buildColumnGeometry } from "./geometry";

export const columnDefinition: NodeDefinition<ColumnNode> = {
  kind: 'column',
  frame: (c) => ({ position: c.position, rotationY: 0 }),
  geometry: buildColumnGeometry,
}