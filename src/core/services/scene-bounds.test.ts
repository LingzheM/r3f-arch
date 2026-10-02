import { describe, expect, it } from 'vitest'
import { BuildingNode } from '../schema/building'
import { LevelNode } from '../schema/level'
import { SiteNode } from '../schema/site'
import { SlabNode } from '../schema/slab'
import type { AnyNode, AnyNodeId } from '../schema/types'
import { WallNode } from '../schema/wall'
import { boundsDiagonal, computeSceneBounds } from './scene-bounds'

const byId = (...nodes: AnyNode[]) =>
  Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<AnyNodeId, AnyNode>

const site = SiteNode.parse({ id: 'site_a', type: 'site' })
const building = BuildingNode.parse({ id: 'building_a', type: 'building', parentId: 'site_a' })
const level = (id: string, ordinal: number) =>
  LevelNode.parse({ id, type: 'level', level: ordinal, height: 2.5, parentId: 'building_a' })

const wall = (id: string, levelId: string) =>
  WallNode.parse({ id, type: 'wall', parentId: levelId, start: [0, 0], end: [4, 0], thickness: 0.2 })

describe('computeSceneBounds（I2）', () => {
  it('空场景 → null', () => {
    expect(computeSceneBounds(byId())).toBeNull()
  })

  it('只有脚手架（site / building / level）→ null，容器不算几何', () => {
    expect(computeSceneBounds(byId(site, building, level('level_0', 0)))).toBeNull()
  })

  it('一堵墙 → 包住它的轮廓 × [层底, 墙顶]', () => {
    const b = computeSceneBounds(byId(site, building, level('level_0', 0), wall('wall_a', 'level_0')))!
    expect(b).not.toBeNull()
    expect(b.min[0]).toBeCloseTo(0)
    expect(b.max[0]).toBeCloseTo(4)
    // 厚 0.2 的墙，中心线在 z=0 ⟹ ±0.1
    expect(b.min[2]).toBeCloseTo(-0.1)
    expect(b.max[2]).toBeCloseTo(0.1)
    expect(b.min[1]).toBeCloseTo(0)
    expect(b.max[1]).toBeCloseTo(2.5)      // 没有 height 的墙顶到层高
  })

  it('加一层 → max.y 增加，min.y 不变', () => {
    const oneStorey = byId(site, building, level('level_0', 0), wall('wall_a', 'level_0'))
    const twoStorey = byId(
      site, building,
      level('level_0', 0), level('level_1', 1),
      wall('wall_a', 'level_0'), wall('wall_b', 'level_1'),
    )

    const a = computeSceneBounds(oneStorey)!
    const b = computeSceneBounds(twoStorey)!

    expect(b.max[1]).toBeGreaterThan(a.max[1])
    expect(b.max[1]).toBeCloseTo(5)        // 二层顶 = 2.5 + 2.5
    expect(b.min[1]).toBeCloseTo(a.min[1])
  })

  it('二层的墙被抬到它那一层的标高上（不是堆在 y=0）', () => {
    const b = computeSceneBounds(byId(
      site, building,
      level('level_0', 0), level('level_1', 1),
      wall('wall_b', 'level_1'),
    ))!
    expect(b.min[1]).toBeCloseTo(2.5)
  })

  it('楼板撑的是 [elevation − 厚, elevation]，不是层顶', () => {
    const slab = SlabNode.parse({
      id: 'slab_a', type: 'slab', parentId: 'level_0',
      polygon: [[0, 0], [3, 0], [3, 2], [0, 2]], elevation: 0, thickness: 0.12,
    })
    const b = computeSceneBounds(byId(site, building, level('level_0', 0), slab))!
    expect(b.min[1]).toBeCloseTo(-0.12)
    expect(b.max[1]).toBeCloseTo(0)
    expect(b.max[0]).toBeCloseTo(3)
    expect(b.max[2]).toBeCloseTo(2)
  })

  it('同一个 nodes 引用重复调用返回同一个对象（WeakMap 缓存）', () => {
    const nodes = byId(site, building, level('level_0', 0), wall('wall_a', 'level_0'))
    expect(computeSceneBounds(nodes)).toBe(computeSceneBounds(nodes))
  })

  it('对角线随楼层增高而变长 —— viewPose 的距离靠它', () => {
    const one = computeSceneBounds(byId(site, building, level('level_0', 0), wall('wall_a', 'level_0')))!
    const two = computeSceneBounds(byId(
      site, building, level('level_0', 0), level('level_1', 1),
      wall('wall_a', 'level_0'), wall('wall_b', 'level_1'),
    ))!
    expect(boundsDiagonal(two)).toBeGreaterThan(boundsDiagonal(one))
  })
})