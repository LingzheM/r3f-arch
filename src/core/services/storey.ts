import { DEFAULT_LEVEL_HEIGHT, getStoredLevelHeight, type LevelNode } from "../schema/level"
import type { AnyNode, AnyNodeId } from "../schema/types"
import type { WallNode } from "../schema/wall"

export type LevelElevation = {
  /** */
  baseY: number
  /** */
  height: number
  buildingId: string | null
  /** */
  ordinal: number
}

const elevationMemo = new WeakMap<object, Map<string, LevelElevation>>()

/**
 * 
 */
export function getLevelElevations(
  nodes: Record<AnyNodeId, AnyNode>,
): Map<string, LevelElevation> {
  const memoized = elevationMemo.get(nodes)
  if (memoized) return memoized

  const buildingIds = new Set<string>()
  const levels: LevelNode[] = []
  for (const node of Object.values(nodes)) {
    if (node.type === 'building') buildingIds.add(node.id)
    else if (node.type === 'level') levels.push(node)
  }

  const entries = levels
    .map((level) => ({
      levelId: level.id as string,
      baseElevation: level.baseElevation,
      height: getStoredLevelHeight(level),

      buildingId: level.parentId !== null && buildingIds.has(level.parentId)
        ? level.parentId
        : null,
      ordinal: level.level,
    }))
    .sort((a, b) => a.ordinal - b.ordinal)

  const elevations = new Map<string, LevelElevation>()
  const cumulativeByBuilding = new Map<string | null, number>()

  for (const entry of entries) {
    const baseY = (cumulativeByBuilding.get(entry.buildingId) ?? 0) + entry.baseElevation
    elevations.set(entry.levelId, {
      baseY,
      height: entry.height,
      buildingId: entry.buildingId,
      ordinal: entry.ordinal,
    })
    cumulativeByBuilding.set(entry.buildingId, baseY + entry.height)
  }

  elevationMemo.set(nodes, elevations)
  return elevations
}

export function levelBaseY(
  levelId: string | null,
  nodes: Record<AnyNodeId, AnyNode>,
): number {
  if (levelId === null) return 0
  return getLevelElevations(nodes).get(levelId)?.baseY ?? 0
}

export function resolveLevelHeight(
  levelId: string | null,
  nodes: Record<AnyNodeId, AnyNode>,
): number {
  if (levelId === null) return DEFAULT_LEVEL_HEIGHT
  return getLevelElevations(nodes).get(levelId)?.height ?? DEFAULT_LEVEL_HEIGHT
}

export function resolveWallTop(
  wall: Pick<WallNode, 'height'>,
  storeyHeight: number,
): number {
  return wall.height ?? storeyHeight
}