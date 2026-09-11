import { describe, expect, it } from 'vitest'
import { DoorNode } from '../../../core/schema/door'
import { WallNode } from '../../../core/schema/wall'
import type { AnyNode, AnyNodeId } from '../../../core/schema/types'
import {
  overlapsExistingOpening,
  resolveOpeningPlacement,
  sideFromNormal,
  slideOpeningAlongWall,
  wallLength,
} from './opening-placement'

const wall = WallNode.parse({ id: 'wall_a', start: [0, 0], end: [4, 0], height: 2.5 })
const door = (id: string, u: number) =>
  DoorNode.parse({ id, parentId: 'wall_a', position: [u, 1.05, 0] }) as AnyNode

const DOOR_SIZE = { width: 0.9, height: 2.1 }

describe('sideFromNormal', () => {
  it('+Z 是 left（D3 的 leftNormal 侧）', () => {
    expect(sideFromNormal([0, 0, 1])).toBe('left')
    expect(sideFromNormal([0, 0, -1])).toBe('right')
  })

  it('没有法线时退回 left，不是抛错', () => {
    expect(sideFromNormal(undefined)).toBe('left')
  })
})

describe('overlapsExistingOpening', () => {
  const span = (left: number, right: number) => ({ left, right, bottom: 0, top: 2.1 })

  it('重叠 → true', () => {
    expect(overlapsExistingOpening(span(1, 2), [door('door_a', 1.5)])).toBe(true)
  })

  it('边对边贴住 → false（两扇门并排是合法的）', () => {
    expect(overlapsExistingOpening(span(1.95, 2.85), [door('door_a', 1.5)])).toBe(false)
  })

  it('排除自己', () => {
    const existing = door('door_a', 1.5)
    expect(overlapsExistingOpening(span(1.05, 1.95), [existing], existing.id)).toBe(false)
  })

  it('非门窗的兄弟不参与判定', () => {
    const column = { id: 'column_a', type: 'column' } as unknown as AnyNode
    expect(overlapsExistingOpening(span(1, 2), [column])).toBe(false)
  })
})

describe('resolveOpeningPlacement', () => {
  const base = {
    wall,
    wallHeight: 2.5,
    size: DOOR_SIZE,
    sill: 0,
    siblings: [] as AnyNode[],
  }

  it('墙中间 → 原样（已量化到 0.1）', () => {
    const r = resolveOpeningPlacement({
      ...base,
      hit: { wallId: 'wall_a' as AnyNodeId, u: 2, side: 'left' },
    })
    expect(r.valid).toBe(true)
    expect(r.position[0]).toBeCloseTo(2, 10)
    expect(r.position[1]).toBeCloseTo(1.05, 10) // sill 0 + 高 2.1 的一半
  })

  it('I4 · 拖到墙外 → 夹到贴边，不越界', () => {
    const r = resolveOpeningPlacement({
      ...base,
      hit: { wallId: 'wall_a' as AnyNodeId, u: -5, side: 'left' },
    })
    expect(r.position[0]).toBeCloseTo(DOOR_SIZE.width / 2, 10)

    const right = resolveOpeningPlacement({
      ...base,
      hit: { wallId: 'wall_a' as AnyNodeId, u: 99, side: 'left' },
    })
    expect(right.position[0]).toBeCloseTo(wallLength(wall) - DOOR_SIZE.width / 2, 10)
  })

  it('量化在夹紧【之前】—— 结果仍然贴边，不是量化后的边界', () => {
    const r = resolveOpeningPlacement({
      ...base,
      hit: { wallId: 'wall_a' as AnyNodeId, u: 3.97, side: 'left' },
    })
    expect(r.position[0]).toBeCloseTo(4 - 0.45, 10)
  })

  it('撞上已有的门 → valid false，但仍然给出位置', () => {
    const r = resolveOpeningPlacement({
      ...base,
      siblings: [door('door_a', 1.5)],
      hit: { wallId: 'wall_a' as AnyNodeId, u: 1.6, side: 'left' },
    })
    expect(r.valid).toBe(false)
    expect(r.position[0]).toBeCloseTo(1.6, 10)
  })

  it('洞比墙宽 → valid false，位置居中（幽灵还得画出来）', () => {
    const r = resolveOpeningPlacement({
      ...base,
      size: { width: 10, height: 2.1 },
      hit: { wallId: 'wall_a' as AnyNodeId, u: 2, side: 'left' },
    })
    expect(r.valid).toBe(false)
    expect(r.position[0]).toBeCloseTo(2, 10)
  })

  it('窗：sill 抬高中心', () => {
    const r = resolveOpeningPlacement({
      ...base,
      size: { width: 1.2, height: 1.2 },
      sill: 0.9,
      hit: { wallId: 'wall_a' as AnyNodeId, u: 2, side: 'left' },
    })
    expect(r.position[1]).toBeCloseTo(1.5, 10)
  })
})

describe('slideOpeningAlongWall', () => {
  it('只动 u，高度和进深不变', () => {
    const r = slideOpeningAlongWall({
      u: 3,
      wall,
      wallHeight: 2.5,
      opening: { position: [1.5, 1.05, 0], width: 0.9, height: 2.1 },
      siblings: [],
      selfId: 'door_a' as AnyNodeId,
    })
    expect(r.position).toEqual([3, 1.05, 0])
  })

  it('滑到墙外 → 夹住', () => {
    const r = slideOpeningAlongWall({
      u: 99,
      wall,
      wallHeight: 2.5,
      opening: { position: [1.5, 1.05, 0], width: 0.9, height: 2.1 },
      siblings: [],
      selfId: 'door_a' as AnyNodeId,
    })
    expect(r.position[0]).toBeCloseTo(4 - 0.45, 10)
  })
})