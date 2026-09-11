import type { AnyNodeDefinition } from "../../core/registry/node-definition";
import type { AnyNode, AnyNodeId, AnyNodeType } from "../../core/schema/types";

export function siblingGroupKey(node: Pick<AnyNode, 'type' | 'parentId'>): string {
  return JSON.stringify([node.type, node.parentId])
}

export type SiblingGroups = {
  siblings: Map<string, AnyNode[]>
  levelData: Map<string, unknown>
}

export function computeSiblingGroups(
  dirtyIds: Iterable<AnyNodeId>,
  nodes: Record<AnyNodeId, AnyNode>,
  getDefinition: (kind: AnyNodeType) => AnyNodeDefinition | undefined,
  effective: (node: AnyNode) => AnyNode,
): SiblingGroups {
  const siblings = new Map<string, AnyNode[]>()
  const levelData = new Map<string, unknown>()

  for (const id of dirtyIds) {
    const node = nodes[id]
    if (!node) continue

    const key = siblingGroupKey(node)
    if (siblings.has(key)) continue

    const group = Object.values(nodes)
      .filter((n) => n.type === node.type && n.parentId === node.parentId)
      .map(effective)
    siblings.set(key, group)

    const def = getDefinition(node.type)
    if (def?.computeLevelData) levelData.set(key, def.computeLevelData(group))
  }
  return { siblings, levelData }
}