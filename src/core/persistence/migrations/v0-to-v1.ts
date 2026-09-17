import type { AnyNode, AnyNodeId } from "../../schema/types"
import { migrateToLevels } from "../../store/migrate-to-levels"
import type { SceneMigration } from "../migrations"
import { deriveRootIds, type RawNode } from "../scene-document"

const CONTAINER_TYPES = new Set(['site', 'building', 'level'])

const LEGACY_SLAB_ELEVATION = 0.05

export const v0Tov1: SceneMigration = {
  from: 0,
  note: 'M8 之前的平场景',
  migrate: (doc) => {
    const flat = !doc.nodes.some((n) => CONTAINER_TYPES.has(String(n.type)))
    if (!flat) return { nodes: doc.nodes, rootNodeIds: doc.rootNodeIds }

    const record: Record<string, RawNode> = {}
    for (const raw of doc.nodes) {
      if (typeof raw.id !== 'string' || raw.id in record) continue
      const slabFixed = raw.type === 'slab' && raw.elevation === LEGACY_SLAB_ELEVATION ? { ...raw, elevation: 0 } : raw
      record[raw.id] = slabFixed
    }

    const wrapped = migrateToLevels({
      nodes: record as unknown as Record<AnyNodeId, AnyNode>,
      rootNodeIds: deriveRootIds(Object.values(record), doc.rootNodeIds) as AnyNodeId[],
    })

    return {
      nodes: Object.values(wrapped.nodes) as unknown as RawNode[],
      rootNodeIds: wrapped.rootNodeIds,
    }
  },
}