import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { DoorNode } from "../../../core/schema/door";
import type { WindowNode } from "../../../core/schema/window";
import { buildDoorGeometry, buildWindowGeometry } from "./geometry";

const openingFrame = (n: DoorNode | WindowNode) => ({
  position: n.position,
  rotationY: n.side === 'left' ? 0 : Math.PI,
})

export const doorDefinition: NodeDefinition<DoorNode> = {
  kind: 'door',
  frame: openingFrame,
  geometry: buildDoorGeometry
}

export const windowDefinition: NodeDefinition<WindowNode> = {
  kind: 'window',
  frame: openingFrame,
  geometry: buildWindowGeometry,
}

