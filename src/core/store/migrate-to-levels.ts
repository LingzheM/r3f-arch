import { BuildingNode } from "../schema/building";
import { DEFAULT_LEVEL_HEIGHT, LevelNode } from "../schema/level";
import { SiteNode } from "../schema/site";
import type { AnyNode, AnyNodeId } from "../schema/types";
import type { SceneSnapshot } from "./history-control";

export function migrateToLevels(snapshot: SceneSnapshot): SceneSnapshot {
  const migrated = Object.values(snapshot.nodes).some(
    (n) => n.type === 'site' || n.type === 'building' || n.type === 'level',
  )
  if (migrated) return snapshot

  const site = SiteNode.parse({ type: 'site' })
  const building = BuildingNode.parse({ type: 'building', parentId: site.id })
  const level = LevelNode.parse({
    type: 'level',
    parentId: building.id,
    level: 0,
    height: DEFAULT_LEVEL_HEIGHT,
  })

  const adopted = snapshot.rootNodeIds.filter((id) => snapshot.nodes[id] !== undefined)

  const nodes: Record<AnyNodeId, AnyNode> = { ...snapshot.nodes }
  for (const id of adopted) {
    nodes[id] = { ...nodes[id]!, parentId: level.id } as AnyNode
  }

  nodes[site.id] = { ...site, children: [building.id] }
  nodes[building.id] = { ...building, children: [level.id] }
  nodes[level.id] = { ...level, children: [...adopted] }

  return { nodes, rootNodeIds: [site.id] }
}