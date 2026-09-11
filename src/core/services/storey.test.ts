import { describe, expect, it } from 'vitest'
import { BuildingNode } from '../schema/building'
import { DEFAULT_LEVEL_HEIGHT, LevelNode } from '../schema/level'
import { WallNode } from '../schema/wall'
import type { AnyNode, AnyNodeId } from '../schema/types'
import { getLevelElevations, levelBaseY, resolveLevelHeight, resolveWallTop } from './storey'

type LevelSpec = {
  id: string
  ordinal: number
  /** 省略 = 层没有 height 这个 key（缺席即数据），不是 undefined。 */
  height?: number
  baseElevation?: number
  building?: string
}

function scene(spec: { buildings?: string[]; levels: LevelSpec[] }): Record<AnyNodeId, AnyNode> {
  const nodes: Record<string, AnyNode> = {}

  for (const id of spec.buildings ?? []) {
    nodes[id] = BuildingNode.parse({ id, type: 'building' })
  }

  for (const level of spec.levels) {
    const input: Record<string, unknown> = {
      id: level.id,
      type: 'level',
      level: level.ordinal,
      parentId: level.building ?? null,
    }
    // 显式赋 undefined 会在 parse 之后留下一个值为 undefined 的 key，
    // 那正是 M8 要靠「key 在不在」判定的东西。只在给了值时才写。
    if (level.height !== undefined) input.height = level.height
    if (level.baseElevation !== undefined) input.baseElevation = level.baseElevation
    nodes[level.id] = LevelNode.parse(input)
  }

  return nodes as Record<AnyNodeId, AnyNode>
}

const wall = (height?: number) => {
  const input: Record<string, unknown> = { id: 'wall_a', type: 'wall', start: [0, 0], end: [4, 0] }
  if (height !== undefined) input.height = height
  return WallNode.parse(input)
}

const baseYOf = (nodes: Record<AnyNodeId, AnyNode>, id: string) =>
  getLevelElevations(nodes).get(id)?.baseY

describe('getLevelElevations', () => {
  it('单栋两层：一层地面 0，二层地面 = 一层层高', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_0', ordinal: 0, height: 2.5, building: 'building_a' },
        { id: 'level_1', ordinal: 1, height: 2.5, building: 'building_a' },
      ],
    })

    expect(baseYOf(nodes, 'level_0')).toBe(0)
    expect(baseYOf(nodes, 'level_1')).toBe(2.5)
  })

  it('层高不同：二层地面跟着一层的层高走，不是常量', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_0', ordinal: 0, height: 3.0, building: 'building_a' },
        { id: 'level_1', ordinal: 1, height: 2.5, building: 'building_a' },
      ],
    })

    expect(baseYOf(nodes, 'level_1')).toBe(3.0)
  })

  it('baseElevation 是【累加】的：抬高本层，也抬高同栋楼所有更高的层', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_0', ordinal: 0, height: 2.5, baseElevation: 0.3, building: 'building_a' },
        { id: 'level_1', ordinal: 1, height: 2.5, building: 'building_a' },
      ],
    })

    expect(baseYOf(nodes, 'level_0')).toBe(0.3)
    // 2.8 而不是 2.5 —— 这一条钉住的就是「别把它改成非累加」
    expect(baseYOf(nodes, 'level_1')).toBeCloseTo(2.8, 10)
  })

  it('有地下室时首层【不在】 y=0 —— 栈从最低序数往上堆', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_b1', ordinal: -1, height: 2.5, building: 'building_a' },
        { id: 'level_0', ordinal: 0, height: 2.5, building: 'building_a' },
      ],
    })

    expect(baseYOf(nodes, 'level_b1')).toBe(0)
    expect(baseYOf(nodes, 'level_0')).toBe(2.5)
  })

  it('把首层拉回 y=0 的正确做法：给【地下室】一个负 baseElevation', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_b1', ordinal: -1, height: 2.5, baseElevation: -2.5, building: 'building_a' },
        { id: 'level_0', ordinal: 0, height: 2.5, building: 'building_a' },
      ],
    })

    expect(baseYOf(nodes, 'level_b1')).toBe(-2.5)
    expect(baseYOf(nodes, 'level_0')).toBe(0)
  })

  it('两栋楼各堆各的', () => {
    const nodes = scene({
      buildings: ['building_a', 'building_b'],
      levels: [
        { id: 'level_a0', ordinal: 0, height: 2.5, building: 'building_a' },
        { id: 'level_a1', ordinal: 1, height: 2.5, building: 'building_a' },
        { id: 'level_b0', ordinal: 0, height: 4.0, building: 'building_b' },
        { id: 'level_b1', ordinal: 1, height: 2.5, building: 'building_b' },
      ],
    })

    expect(baseYOf(nodes, 'level_a1')).toBe(2.5)
    expect(baseYOf(nodes, 'level_b1')).toBe(4.0)
  })

  it('解析不到楼栋的层共用一个遗留栈，不掺进别人的楼', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_a0', ordinal: 0, height: 2.5, building: 'building_a' },
        { id: 'level_x0', ordinal: 0, height: 3.0 },
        { id: 'level_x1', ordinal: 1, height: 3.0 },
      ],
    })

    expect(getLevelElevations(nodes).get('level_x0')?.buildingId).toBe(null)
    expect(baseYOf(nodes, 'level_x0')).toBe(0)
    expect(baseYOf(nodes, 'level_x1')).toBe(3.0)
    // 楼 A 完全没被这三层影响
    expect(baseYOf(nodes, 'level_a0')).toBe(0)
  })

  it('层没有 height 时用常量兜底，并照常参与堆叠', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_0', ordinal: 0, building: 'building_a' },
        { id: 'level_1', ordinal: 1, building: 'building_a' },
      ],
    })

    expect(getLevelElevations(nodes).get('level_0')?.height).toBe(DEFAULT_LEVEL_HEIGHT)
    expect(baseYOf(nodes, 'level_1')).toBe(DEFAULT_LEVEL_HEIGHT)
  })
})

describe('resolveWallTop', () => {
  it('height 缺席 ⟹ plane-bound，顶 = 层高', () => {
    expect(resolveWallTop(wall(), 3.0)).toBe(3.0)      // ← 3.0 不是 2.5，见下面的注
  })

  it('height 在 ⟹ explicit，顶 = 它自己', () => {
    expect(resolveWallTop(wall(1.0), 3.0)).toBe(1.0)
  })

  it('改层高：plane-bound 的墙跟着变', () => {
    const w = wall()
    expect(resolveWallTop(w, 2.5)).toBe(2.5)
    expect(resolveWallTop(w, 3.0)).toBe(3.0)
  })

  it('改层高：explicit 的墙纹丝不动', () => {
    const w = wall(1.0)
    expect(resolveWallTop(w, 2.5)).toBe(1.0)
    expect(resolveWallTop(w, 3.0)).toBe(1.0)
  })
})

describe('levelBaseY / resolveLevelHeight 的兜底', () => {
  it('没有层（null 或未知 id）时地面在 0', () => {
    const nodes = scene({ levels: [] })
    expect(levelBaseY(null, nodes)).toBe(0)
    expect(levelBaseY('level_nope', nodes)).toBe(0)
  })

  it('没有层时层高按常量 —— 这一侧用常量是对的', () => {
    const nodes = scene({ levels: [] })
    expect(resolveLevelHeight(null, nodes)).toBe(DEFAULT_LEVEL_HEIGHT)
    expect(resolveLevelHeight('level_nope', nodes)).toBe(DEFAULT_LEVEL_HEIGHT)
  })
})

describe('记忆化', () => {
  it('同一个 nodes 对象 ⟹ 同一个 Map 实例（没有重算）', () => {
    const nodes = scene({
      buildings: ['building_a'],
      levels: [{ id: 'level_0', ordinal: 0, height: 2.5, building: 'building_a' }],
    })

    expect(getLevelElevations(nodes)).toBe(getLevelElevations(nodes))
  })

  it('换了 nodes 对象 ⟹ 重算，读到的是新值', () => {
    const before = scene({
      buildings: ['building_a'],
      levels: [
        { id: 'level_0', ordinal: 0, height: 2.5, building: 'building_a' },
        { id: 'level_1', ordinal: 1, height: 2.5, building: 'building_a' },
      ],
    })
    expect(baseYOf(before, 'level_1')).toBe(2.5)

    // useScene 改层高时是整体替换 nodes，这里照着做
    const after = { ...before } as Record<AnyNodeId, AnyNode>
    after['level_0' as AnyNodeId] = LevelNode.parse({
      id: 'level_0', type: 'level', level: 0, height: 3.0, parentId: 'building_a',
    })

    expect(getLevelElevations(after)).not.toBe(getLevelElevations(before))
    expect(baseYOf(after, 'level_1')).toBe(3.0)
  })
})