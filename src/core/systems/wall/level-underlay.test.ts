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

describe('levelBelowFootprints', () => {
  it('最底层没有图', () => {
    expect(levelBelowFootprints(asId('level_0'), house)).toEqual([])
  })

  it('二层 → 一层每堵墙一个多边形', () => {
    const plans = levelBelowFootprints(asId('level_1'), house)
    expect(plans).toHaveLength(2)
  })

  it('每个多边形至少4个顶点', () => {
    for (const plan of levelBelowFootprints(asId('level_1'), house)) {
      expect(plan.length).toBeGreaterThanOrEqual(4)
    }
  })
})