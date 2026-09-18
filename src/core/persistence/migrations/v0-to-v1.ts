import { generateId } from "../../schema/base"
import type { SceneMigration } from "../migrations"
import { deriveRootIds, type RawNode } from "../scene-document"

const CONTAINER_TYPES = new Set(['site', 'building', 'level'])

const V0_SLAB_ELEVATION = 0.05

const V1_LEVEL_HEIGHT = 2.5

const v1Container = (
  type: 'site' | 'building' | 'level',
  id: string,
  parentId: string | null,
  children: string[],
  extra: RawNode = {},
): RawNode => ({ object: 'node', id, type, parentId, children, visible: true, metadata: {}, ...extra })

export const v0ToV1: SceneMigration = {
  from: 0,
  note: 'M8 之前的平场景',
  migrate: (doc) => {
    const flat = !doc.nodes.some((n) => CONTAINER_TYPES.has(String(n.type)))
    if (!flat) return { nodes: doc.nodes, rootNodeIds: doc.rootNodeIds }

    const keyed = new Map<string, RawNode>()
    const passThrough: RawNode[] = []
    for (const raw of doc.nodes) {
      if (typeof raw.id !== 'string' || keyed.has(raw.id)) {
        passThrough.push(raw)
        continue
      }
      keyed.set(raw.id, raw.type === 'slab' && raw.elevation === V0_SLAB_ELEVATION ? { ...raw, elevation: 0 } : raw)
    }

    const siteId = generateId('site')
    const buildingId = generateId('building')
    const levelId = generateId('level')

    const adopted = deriveRootIds([...keyed.values()], doc.rootNodeIds)
    for (const id of adopted) keyed.set(id, { ...keyed.get(id), parentId: levelId })


    return {
      nodes: [
        v1Container('site', siteId, null, [buildingId]),
        v1Container('building', buildingId, siteId, [levelId]),
        v1Container('level', levelId, buildingId, adopted, { level: 0, baseElevation: 0, height: V1_LEVEL_HEIGHT }),
        ...keyed.values(),
        ...passThrough,
      ],
      rootNodeIds: [siteId],
    }
  },
}