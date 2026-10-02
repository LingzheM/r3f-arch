import { object } from "zod";
import { wallFootprint, type Point2D } from "../lib/geometry-2d";
import type { AnyNode, AnyNodeId } from "../schema/types";
import { getLevelElevations, resolveCeilingHeight, resolveWallTop, type LevelElevation } from "./storey";
import { getWallThickness, wallEnd, wallStart } from "../schema/wall";
import { getCeilingThickness } from "../schema/ceiling";
import { getSlabThickness } from "../schema/slab";
import { getColumnDepth, getColumnHeight, getColumnRadius, getColumnWidth } from "../schema/column";

export type Vec3 = readonly [number, number, number]

export type SceneBounds = { min: Vec3; max: Vec3 }

const DEFAULT_LEVEL: LevelElevation = { baseY: 0, height: 2.5, buildingId: null, ordinal: 0 }

const boundsMemo = new WeakMap<object, { value: SceneBounds | null }>()

/**
 * 整个场景的包围盒， `viewPose` 用它决定相机放在哪。
 * 
 * 容器（site / building / level） 不算几何 —— 只有 level 里的东西算。
 * @param nodes 
 */
export function computeSceneBounds(
  nodes: Record<AnyNodeId, AnyNode>,
): SceneBounds | null {
  const memo = boundsMemo.get(nodes)
  if (memo) return memo.value

  const elevations = getLevelElevations(nodes)
  const levelOf = (parentId: string | null): LevelElevation =>
    (parentId === null ? undefined : elevations.get(parentId)) ?? DEFAULT_LEVEL

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY
  let seen = false

  const add = (p: Point2D, y: number): void => {
    seen = true
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minZ) minZ = p.y
    if (p.y > maxZ) maxZ = p.y
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const addSpan = (plan: readonly Point2D[], bottom: number, top: number): void => {
    for (const p of plan) {
      add(p, bottom)
      add(p, top)
    }
  }

  for (const node of Object.values(nodes)) {
    switch (node.type) {
      case 'wall': {
        const level = levelOf(node.parentId)
        const plan = wallFootprint(wallStart(node), wallEnd(node), getWallThickness(node))
        addSpan(plan, level.baseY, level.baseY + resolveWallTop(node, level.height))
        break
      }
      case 'slab': {
        const level = levelOf(node.parentId)
        const top = level.baseY + node.elevation
        addSpan(toPlan(node.polygon), top - getSlabThickness(node), top)
        break
      }
      case 'ceiling': {
        const level = levelOf(node.parentId)
        const bottom = level.baseY + resolveCeilingHeight(node, level.height)
        addSpan(toPlan(node.polygon), bottom, bottom + getCeilingThickness(node))
        break
      }
      case 'column': {
        const level = levelOf(node.parentId)
        const [x, y, z] = node.position
        const halfX = node.crossSection === 'round' ? getColumnRadius(node) : getColumnWidth(node) / 2
        const halfZ = node.crossSection === 'round' ? getColumnRadius(node) : getColumnDepth(node) / 2
        const bottom = level.baseY + y
        addSpan(
          [
            { x: x - halfX, y: z - halfZ },
            { x: x + halfX, y: z + halfZ },
          ],
          bottom,
          bottom + getColumnHeight(node),
        )
        break
      }
      default:
        break
    }
  }

  const value: SceneBounds | null = seen
    ? { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] }
    : null

  boundsMemo.set(nodes, { value })
  return value
}

const toPlan = (polygon: readonly (readonly [number, number])[]): Point2D[] => polygon.map(([x, y]) => ({ x, y }))

export const boundsDiagonal = (b: SceneBounds): number =>
  Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2])