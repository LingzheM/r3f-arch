import { AnyNode, type AnyNodeId } from "../schema/types";
import type { SceneSnapshot } from "../store/history-control";
import { deriveRootIds, type RawNode } from "./scene-document";

export type DropReason = 'invalid' | 'duplicate-id' | 'missing-parent' | 'cycle' | 'ancestor-dropped'
export type DroppedNode = { id: string | null; reason: DropReason }
export type LoadReport = { dropped: DroppedNode[]; repairedParents: string[] }

export function normalizeSceneNodes(
  rawNodes: readonly RawNode[],
  saveRootIds: readonly unknown[],
): { snapshot: SceneSnapshot; report: LoadReport } {
  const dropped: DroppedNode[] = []
  const parsed = new Map<string, AnyNode>()

  for (const raw of rawNodes) {
    if (typeof raw.id !== 'string') {
      dropped.push({ id: null, reason: 'invalid' })
      continue
    }
    const result = AnyNode.safeParse(raw)
    if (!result.success) {
      dropped.push({ id: raw.id, reason: 'invalid' })
      continue
    }
    if (parsed.has(result.data.id)) {
      dropped.push({ id: result.data.id, reason: 'duplicate-id' })
      continue
    }
    parsed.set(result.data.id, result.data)
  }

  const verdict = new Map<string, DropReason | 'ok'>()
  const settle = (id: string): DropReason | 'ok' => {
    const path: string[] = []
    const onPath = new Set<string>()
    let cursor: string | null = id
    let outcome: DropReason | 'ok' = 'ok'
    let cycleAt = -1


    while (cursor !== null) {
      const known = verdict.get(cursor)
      if (known !== undefined) {
        outcome = known === 'ok' ? 'ok' : 'ancestor-dropped'
        break
      }
      if (onPath.has(cursor)) {
        outcome = 'cycle'
        cycleAt = path.indexOf(cursor)
        break
      }
      const node = parsed.get(cursor)
      if (!node) {
        outcome = 'missing-parent'
        break
      }
      path.push(cursor)
      onPath.add(cursor)
      cursor = node.parentId
    }

    path.forEach((p, i) => {
      if (outcome === 'ok') verdict.set(p, 'ok')
      else if (outcome === 'missing-parent') verdict.set(p, i === path.length - 1 ? 'missing-parent' : 'ancestor-dropped')
      else if (outcome === 'cycle') verdict.set(p, i >= cycleAt ? 'cycle' : 'ancestor-dropped')
      else verdict.set(p, 'ancestor-dropped')
    })
    return verdict.get(id) ?? outcome
  }

  const nodes: Record<AnyNodeId, AnyNode> = {}
  for (const [id, node] of parsed) {
    const v = settle(id)
    if (v === 'ok') nodes[id as AnyNodeId] = node
    else dropped.push({ id, reason: v })
  }

  const actualChildren = new Map<string, string[]>()
  for (const node of Object.values(nodes)) {
    if (node.parentId === null) continue
    const list = actualChildren.get(node.parentId) ?? []
    list.push(node.id)
    actualChildren.set(node.parentId, list)
  }

  const repairedParents: string[] = []
  for (const node of Object.values(nodes)) {
    const actual = actualChildren.get(node.id) ?? []
    const actualSet = new Set(actual)
    const ordered: string[] = []
    const seen = new Set<string>()
    for (const c of node.children) {
      if (actualSet.has(c) && !seen.has(c)) {
        ordered.push(c)
        seen.add(c)
      }
    }
    for (const c of actual) if (!seen.has(c)) ordered.push(c)

    const same = ordered.length === node.children.length && ordered.every((c, i) => c === node.children[i])
    if (!same) {
      nodes[node.id as AnyNodeId] = { ...node, children: ordered } as AnyNode
      repairedParents.push(node.id)
    }
  }

  return {
    snapshot: { nodes, rootNodeIds: deriveRootIds(Object.values(nodes), saveRootIds) as AnyNodeId[] },
    report: { dropped, repairedParents },
  }
}