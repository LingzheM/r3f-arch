import { describe, expect, it } from "vitest";
import type { AnyNode, AnyNodeId } from "../../schema/types";
import { levelBelowFootprints } from "./level-underlay";
import { BuildingNode } from "../../schema/building";
import { LevelNode } from "../../schema/level";
import { WallNode } from "../../schema/wall";

const byId = (...nodes: AnyNode[]) => Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<AnyNodeId, AnyNode>

const asId = (id: string) => id as AnyNodeId

const building = (id: string) => BuildingNode.parse({ id, type: 'building' })

const level = (id: string, ordinal: number, parentId: string) =>
  LevelNode.parse({ id, type: 'level', level: ordinal, height: 2.5, parentId })

const wall = (id: string, levelId: string, start: [number, number], end: [number, number]) =>
  WallNode.parse({ id, type: 'wall', parentId: levelId, start, end, thickness: 0.2 })

const house = byId(
  building('building_a'),
  level('level_0', 0, 'building_a'),
  level('level_1', 1, 'building_a'),
  wall('wall_g1', 'level_0', [0, 0], [4, 0]),
  wall('wall_g2', 'level_0', [4, 0], [4, 3]),
  wall('wall_u1', 'level_1', [0, 0], [4, 0]),
)

describe('levelBelowFootprints（I5）', () => {
  it('最底层没有底图', () => {
    expect(levelBelowFootprints(asId('level_0'), house)).toEqual([])
  })

  it('二层 → 一层每堵墙一个多边形', () => {
    const plans = levelBelowFootprints(asId('level_1'), house)
    expect(plans).toHaveLength(2)
  })

  it('每个多边形至少 4 个顶点（墙是个矩形，转角处还会多一个斜接点）', () => {
    for (const plan of levelBelowFootprints(asId('level_1'), house)) {
      expect(plan.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('转角按那一层自己的墙斜接 —— 底图和真墙在拐角处是重合的', () => {
    // wall_g1 和 wall_g2 在 (4, 0) 相交。斜接算对了，两条轮廓都会把交点本身
    // 放进多边形（getWallPlanFootprint 的 hasJunctionAt 分支）。
    // 用别的墙集合（或空集合）算斜接，这个顶点就没了，底图在拐角处会豁一个口。
    const plans = levelBelowFootprints(asId('level_1'), house)
    const atCorner = plans.filter((plan) =>
      plan.some((p) => Math.abs(p.x - 4) < 1e-9 && Math.abs(p.y) < 1e-9),
    )
    expect(atCorner).toHaveLength(2)
  })

  it('斜接只看那一层：上层多一堵墙撞在同一个交点上，底图一个点都不动', () => {
    const withUpperSpur = byId(
      ...Object.values(house),
      wall('wall_u2', 'level_1', [4, 0], [4, -3]),
    )
    expect(levelBelowFootprints(asId('level_1'), withUpperSpur))
      .toEqual(levelBelowFootprints(asId('level_1'), house))
  })

  it('轮廓是带厚度的，不是中心线', () => {
    const plans = levelBelowFootprints(asId('level_1'), house)
    const zs = plans.flat().map((p) => p.y)
    expect(Math.max(...zs)).toBeGreaterThan(0)      // 厚 0.2 ⟹ 中心线两侧各 0.1
    expect(Math.min(...zs)).toBeLessThan(0)
  })

  it('另一栋楼的墙不算 —— 这条是 D35「不重写 5 行」的理由', () => {
    const twoBuildings = byId(
      ...Object.values(house),
      building('building_b'),
      level('level_other', 0, 'building_b'),
      wall('wall_other', 'level_other', [50, 50], [54, 50]),
    )

    const plans = levelBelowFootprints(asId('level_1'), twoBuildings)
    expect(plans).toHaveLength(2)
    expect(plans.flat().every((p) => p.x < 10)).toBe(true)
  })

  it('下面那层一堵墙都没有 → 空数组，不是 undefined', () => {
    const empty = byId(
      building('building_a'),
      level('level_0', 0, 'building_a'),
      level('level_1', 1, 'building_a'),
      wall('wall_u1', 'level_1', [0, 0], [4, 0]),
    )
    expect(levelBelowFootprints(asId('level_1'), empty)).toEqual([])
  })

  it('当前层是 null 或不存在时不崩', () => {
    expect(levelBelowFootprints(null, house)).toEqual([])
    expect(levelBelowFootprints(asId('level_gone'), house)).toEqual([])
  })

  it('隔一层也不画：三层只画二层，不画一层', () => {
    const threeStorey = byId(
      ...Object.values(house),
      level('level_2', 2, 'building_a'),
      wall('wall_t1', 'level_1', [0, 3], [4, 3]),
    )
    // 二层有两堵（wall_u1 + wall_t1），一层有两堵 —— 画出来必须是二层那两堵
    expect(levelBelowFootprints(asId('level_2'), threeStorey)).toHaveLength(2)
  })
})