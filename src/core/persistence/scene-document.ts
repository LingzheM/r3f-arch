import type { AnyNode, AnyNodeId } from "../schema/types"
import type { SceneSnapshot } from "../store/history-control"

export const SCENE_FORMAT = 'r3f-arch/scene'
export const CURRENT_SCENE_VERSION = 1

export type RawNode = Record<string, unknown>

export type RawSceneDocument = {
  version: number
  nodes: RawNode[]
  rootNodeIds: string[]
}

export type SceneDocument = {
  format: typeof SCENE_FORMAT
  version: number
  nodes: AnyNode[]
  rootNodeIds: AnyNodeId[]
}

export function toSceneDocument(snapshot: SceneSnapshot): SceneDocument {
  return {
    format: SCENE_FORMAT,
    version: CURRENT_SCENE_VERSION,
    nodes: Object.values(snapshot.nodes),
    rootNodeIds: [...snapshot.rootNodeIds],
  }
}

export function deriveRootIds(
  nodes: readonly { id?: unknown; parentId?: unknown }[],
  saved: readonly unknown[],
): string[] {
  const roots = new Set<string>()
  for (const n of nodes) {
    if (typeof n.id === 'string' && (n.parentId === null || n.parentId === undefined)) roots.add(n.id)
  }

  const out: string[] = []
  const seen = new Set<string>()
  for (const id of saved) {
    if (typeof id === 'string' && roots.has(id) && !seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  for (const id of roots) if (!seen.has(id)) out.push(id)
  return out
}