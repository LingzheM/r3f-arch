import { LevelNode } from "../../../core/schema/level";
import { asNodeId, type AnyNode, type AnyNodeId } from "../../../core/schema/types";

const levelsOf = (nodes: Record<AnyNodeId, AnyNode>): LevelNode[] =>
  Object.values(nodes).filter((n): n is LevelNode => n.type === 'level')

export function resolveCurrentLevelId(
  preferred: AnyNodeId | null,
  nodes: Record<AnyNodeId, AnyNode>,
): AnyNodeId | null {
  if (preferred !== null && nodes[preferred]?.type === 'level') return preferred

  const levels = levelsOf(nodes)
  if (levels.length === 0) return null

  levels.sort((a, b) => a.level - b.level || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const ground = levels.find((l) => l.level === 0)
  return asNodeId((ground ?? levels[0]!).id)
}

export function adjacentLevelId(
  currentId: AnyNodeId | null,
  nodes: Record<AnyNodeId, AnyNode>,
  direction: 1 | -1,
): AnyNodeId | null {
  if (currentId === null) return null
  const current = nodes[currentId]
  if (current?.type !== 'level') return null

  const stack = levelsOf(nodes)
    .filter((l) => l.parentId === current.parentId)
    .sort((a, b) => a.level - b.level)

  const index = stack.findIndex((l) => l.id === current.id)
  const next = stack[index + direction]
  return next ? asNodeId(next.id) : null
}

export function nextLevelOrdinal(
  parentId: string | null,
  nodes: Record<AnyNodeId, AnyNode>,
): number {
  const ordinals = levelsOf(nodes)
    .filter((l) => l.parentId === parentId)
    .map((l) => l.level)

  return ordinals.length === 0 ? 0 : Math.max(...ordinals) + 1
}