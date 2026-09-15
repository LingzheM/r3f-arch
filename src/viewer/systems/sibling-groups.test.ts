import { describe, expect, it } from 'vitest'
import type { AnyNodeDefinition } from '../../core/registry/node-definition'
import { DoorNode } from '../../core/schema/door'
import { LevelNode } from '../../core/schema/level'
import type { AnyNode, AnyNodeId, AnyNodeType } from '../../core/schema/types'
import { WallNode } from '../../core/schema/wall'
import {
  calculateLevelMiters,
  getWallMiterBoundaryPoints,
  hasJunctionAt,
  type MiterData,
} from '../../core/systems/wall/wall-mitering'
import { computeSiblingGroups, siblingGroupKey } from './sibling-groups'

const level = (id: string, ordinal: number) =>
  LevelNode.parse({ id, type: 'level', level: ordinal, height: 2.5 })

const wallOn = (id: string, parentId: string, start: [number, number], end: [number, number]) =>
  WallNode.parse({ id, type: 'wall', parentId, start, end })

const byId = (...nodes: AnyNode[]) =>
  Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<AnyNodeId, AnyNode>

const asId = (id: string) => id as AnyNodeId

// 和真实注册表一致：只有墙声明 computeLevelData。
// 故意不 import viewer/nodes/wall/definition —— 那会把 three 整个拖进这个测试。
const getDefinition = (kind: AnyNodeType): AnyNodeDefinition | undefined =>
  kind === 'wall'
    ? ({
      kind: 'wall',
      computeLevelData: (walls: readonly AnyNode[]) => calculateLevelMiters([...walls] as WallNode[]),
    } as AnyNodeDefinition)
    : undefined

const identity = (n: AnyNode) => n

describe('siblingGroupKey', () => {
  it('同 kind 同宿主 → 同一组', () => {
    expect(siblingGroupKey({ type: 'wall', parentId: 'level_a' }))
      .toBe(siblingGroupKey({ type: 'wall', parentId: 'level_a' }))
  })

  it('同 kind 不同宿主 → 不同组（M8 要修的就是这一刀）', () => {
    expect(siblingGroupKey({ type: 'wall', parentId: 'level_a' }))
      .not.toBe(siblingGroupKey({ type: 'wall', parentId: 'level_b' }))
  })

  it('同宿主不同 kind → 不同组', () => {
    expect(siblingGroupKey({ type: 'wall', parentId: 'level_a' }))
      .not.toBe(siblingGroupKey({ type: 'slab', parentId: 'level_a' }))
  })

  it('没有宿主（null）和空字符串宿主不撞键', () => {
    expect(siblingGroupKey({ type: 'wall', parentId: null }))
      .not.toBe(siblingGroupKey({ type: 'wall', parentId: '' }))
  })
})

describe('computeSiblingGroups', () => {
  // 楼上楼下外墙线完全重合的 L 形转角 —— 真实住宅里最常见的情况。
  const scene = byId(
    level('level_1', 0),
    level('level_2', 1),
    wallOn('wall_a1', 'level_1', [0, 0], [4, 0]),
    wallOn('wall_a2', 'level_1', [4, 0], [4, 4]),
    wallOn('wall_b1', 'level_2', [0, 0], [4, 0]),
    wallOn('wall_b2', 'level_2', [4, 0], [4, 4]),
  )
  const a1 = scene[asId('wall_a1')] as WallNode
  const a2 = scene[asId('wall_a2')] as WallNode
  const b1 = scene[asId('wall_b1')] as WallNode
  const b2 = scene[asId('wall_b2')] as WallNode

  it('一层的斜接结果 = 一层单独算的结果（不掺二层同坐标的墙）', () => {
    const groups = computeSiblingGroups([a1.id], scene, getDefinition, identity)
    const miter = groups.levelData.get(siblingGroupKey(a1)) as MiterData

    const alone = calculateLevelMiters([a1, a2])
    expect(getWallMiterBoundaryPoints(a1, miter)).toEqual(getWallMiterBoundaryPoints(a1, alone))
  })

  it('对照组：按 kind 全场景算，结果确实不同 —— 证明上一条不是空测试', () => {
    const alone = calculateLevelMiters([a1, a2])
    const perKind = calculateLevelMiters([a1, a2, b1, b2])

    expect(getWallMiterBoundaryPoints(a1, perKind)).not.toEqual(getWallMiterBoundaryPoints(a1, alone))
  })

  it('两层各有一堵脏墙 → 两组各算各的，不复用先算出来的那一份', () => {
    // 二层换一个不同的轮廓，转角在 [3, 0]，这样两份结果可区分
    const s = byId(
      level('level_1', 0),
      level('level_2', 1),
      wallOn('wall_a1', 'level_1', [0, 0], [4, 0]),
      wallOn('wall_a2', 'level_1', [4, 0], [4, 4]),
      wallOn('wall_b1', 'level_2', [0, 0], [3, 0]),
      wallOn('wall_b2', 'level_2', [3, 0], [3, 3]),
    )
    const wa1 = s[asId('wall_a1')] as WallNode
    const wb1 = s[asId('wall_b1')] as WallNode

    const groups = computeSiblingGroups([wa1.id, wb1.id], s, getDefinition, identity)
    const floor1 = groups.levelData.get(siblingGroupKey(wa1)) as MiterData | undefined
    const floor2 = groups.levelData.get(siblingGroupKey(wb1)) as MiterData | undefined

    expect(floor1).toBeDefined()
    expect(floor2).toBeDefined()
    expect(hasJunctionAt(wa1, { x: 4, y: 0 }, floor1!)).toBe(true)
    expect(hasJunctionAt(wb1, { x: 3, y: 0 }, floor2!)).toBe(true)
    // 二层那份里不该出现一层的转角
    expect(hasJunctionAt(wa1, { x: 4, y: 0 }, floor2!)).toBe(false)
  })

  it('兄弟列表只含同层同 kind 的节点', () => {
    const groups = computeSiblingGroups([a1.id], scene, getDefinition, identity)

    expect(groups.siblings.get(siblingGroupKey(a1))!.map((n) => n.id).sort())
      .toEqual(['wall_a1', 'wall_a2'])
  })

  it('没声明 computeLevelData 的 kind：有兄弟分组，没有 levelData', () => {
    const s = byId(
      level('level_1', 0),
      wallOn('wall_a1', 'level_1', [0, 0], [4, 0]),
      DoorNode.parse({ id: 'door_x', parentId: 'wall_a1', position: [1, 1.05, 0] }),
    )
    const door = s[asId('door_x')]!
    const groups = computeSiblingGroups([door.id], s, getDefinition, identity)

    expect(groups.siblings.get(siblingGroupKey(door))!.map((n) => n.id)).toEqual(['door_x'])
    expect(groups.levelData.has(siblingGroupKey(door))).toBe(false)
  })

  it('脏集里有已经删掉的 id → 跳过，不抛错', () => {
    expect(() => computeSiblingGroups([asId('wall_gone')], scene, getDefinition, identity)).not.toThrow()
  })

  it('套用 effective（拖拽中的 live override）：分组里拿到的是覆盖后的节点', () => {
    const dragging = (n: AnyNode) => (n.id === 'wall_a2' ? ({ ...n, end: [4, 9] } as AnyNode) : n)
    const groups = computeSiblingGroups([a1.id], scene, getDefinition, dragging)
    const a2Live = groups.siblings.get(siblingGroupKey(a1))!.find((n) => n.id === 'wall_a2') as WallNode

    expect(a2Live.end).toEqual([4, 9])
  })
})