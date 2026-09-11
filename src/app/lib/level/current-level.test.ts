import { describe, expect, it } from 'vitest'
import { BuildingNode } from '../../../core/schema/building'
import { LevelNode } from '../../../core/schema/level'
import type { AnyNode, AnyNodeId } from '../../../core/schema/types'
import { WallNode } from '../../../core/schema/wall'
import { adjacentLevelId, nextLevelOrdinal, resolveCurrentLevelId } from './current-level'

const level = (id: string, ordinal: number, parentId: string | null = 'building_a') =>
  LevelNode.parse({ id, type: 'level', level: ordinal, height: 2.5, parentId })

const byId = (...nodes: AnyNode[]) =>
  Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<AnyNodeId, AnyNode>

const asId = (id: string) => id as AnyNodeId

const building = (id: string) => BuildingNode.parse({ id, type: 'building' })

describe('resolveCurrentLevelId', () => {
  const nodes = byId(building('building_a'), level('level_b1', -1), level('level_0', 0), level('level_1', 1))

  it('preferred 还是一个层 → 原样返回', () => {
    expect(resolveCurrentLevelId(asId('level_1'), nodes)).toBe('level_1')
  })

  it('preferred 已经不存在（撤销 / 删除之后）→ 回落到序数 0，不是序数最小的地下室', () => {
    expect(resolveCurrentLevelId(asId('level_gone'), nodes)).toBe('level_0')
  })

  it('preferred 指向的不是层（比如一堵墙）→ 同样回落', () => {
    const withWall = {
      ...nodes,
      ['wall_x' as AnyNodeId]: WallNode.parse({ id: 'wall_x', type: 'wall', start: [0, 0], end: [1, 0] }),
    }
    expect(resolveCurrentLevelId(asId('wall_x'), withWall)).toBe('level_0')
  })

  it('没有序数 0 → 序数最小的层', () => {
    const noGround = byId(building('building_a'), level('level_2', 2), level('level_1', 1))
    expect(resolveCurrentLevelId(null, noGround)).toBe('level_1')
  })

  it('同序数（两栋楼各有一个 0 层）→ 按 id 确定，不看 Object.values 的顺序', () => {
    const twoBuildings = byId(level('level_zz', 0, 'building_b'), level('level_aa', 0, 'building_a'))
    expect(resolveCurrentLevelId(null, twoBuildings)).toBe('level_aa')
  })

  it('一个层都没有 → null', () => {
    expect(resolveCurrentLevelId(null, byId())).toBeNull()
  })
})

describe('adjacentLevelId', () => {
  const nodes = byId(
    building('building_a'),
    level('level_0', 0),
    level('level_1', 1),
    level('level_3', 3), // 序数不连续：2 被删过
    level('level_other', 1, 'building_b'),
  )

  it('往上 / 往下', () => {
    expect(adjacentLevelId(asId('level_0'), nodes, 1)).toBe('level_1')
    expect(adjacentLevelId(asId('level_1'), nodes, -1)).toBe('level_0')
  })

  it('序数不连续时跳到下一个存在的层，不是 level ± 1', () => {
    expect(adjacentLevelId(asId('level_1'), nodes, 1)).toBe('level_3')
  })

  it('到头了 → null', () => {
    expect(adjacentLevelId(asId('level_3'), nodes, 1)).toBeNull()
    expect(adjacentLevelId(asId('level_0'), nodes, -1)).toBeNull()
  })

  it('不会跨到别的楼栋', () => {
    // building_b 也有一个序数 1，但它不在 level_0 的栈里
    expect(adjacentLevelId(asId('level_0'), nodes, 1)).not.toBe('level_other')
  })
})

describe('nextLevelOrdinal', () => {
  it('这栋楼还没有层 → 0', () => {
    expect(nextLevelOrdinal('building_a', byId(building('building_a')))).toBe(0)
  })

  it('最高序数 + 1，按楼栋分开算', () => {
    const nodes = byId(level('level_0', 0), level('level_3', 3), level('level_b9', 9, 'building_b'))
    expect(nextLevelOrdinal('building_a', nodes)).toBe(4)
    expect(nextLevelOrdinal('building_b', nodes)).toBe(10)
  })
})