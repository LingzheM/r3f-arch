import { wallFootprint, type Point2D } from '../lib/geometry-2d'
import { getCeilingThickness } from '../schema/ceiling'
import { getColumnDepth, getColumnRadius, getColumnWidth, getColumnHeight } from '../schema/column'
import { getSlabThickness } from '../schema/slab'
import type { AnyNode, AnyNodeId } from '../schema/types'
import { getWallThickness, wallEnd, wallStart } from '../schema/wall'
import {
  getLevelElevations,
  resolveCeilingHeight,
  resolveWallTop,
  type LevelElevation,
} from './storey'

export type Vec3 = readonly [number, number, number]

/** 世界坐标的轴对齐包围盒。没有任何可见几何时是 `null`。 */
export type SceneBounds = { min: Vec3; max: Vec3 }

const DEFAULT_LEVEL: LevelElevation = { baseY: 0, height: 2.5, buildingId: null, ordinal: 0 }

const boundsMemo = new WeakMap<object, { value: SceneBounds | null }>()

/**
 * 整个场景的包围盒，`viewPose` 用它决定相机放哪。
 *
 * 容器（site / building / level）不算几何 —— 只有 level 里的东西算。
 * 所以空场景和「只有脚手架」的新场景都返回 null，由 viewPose 兜默认盒（I2）。
 *
 * 缓存按 `nodes` 的引用（和 getLevelElevations 同一套路）：store 不改引用就不重算，
 * app 每帧读也不会变成 O(节点数) 的热点。
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

  /** Point2D.y 是世界 Z（D3） */
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
      // 门窗在墙里面，撑不大盒子；容器没有几何。
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

const toPlan = (polygon: readonly (readonly [number, number])[]): Point2D[] =>
  polygon.map(([x, y]) => ({ x, y }))

export const boundsCenter = (b: SceneBounds): Vec3 => [
  (b.min[0] + b.max[0]) / 2,
  (b.min[1] + b.max[1]) / 2,
  (b.min[2] + b.max[2]) / 2,
]

export const boundsDiagonal = (b: SceneBounds): number =>
  Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2])
