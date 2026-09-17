import { describe, expect, it } from 'vitest'
import { DoorNode } from '../schema/door'
import { DEFAULT_LEVEL_HEIGHT, LevelNode } from '../schema/level'
import { SiteNode } from '../schema/site'
import type { AnyNode, AnyNodeId } from '../schema/types'
import { WallNode } from '../schema/wall'
import type { SceneSnapshot } from './history-control'
import { migrateToLevels } from './migrate-to-levels'

const asId = (id: string) => id as AnyNodeId

const wall = (id: string, extra: Record<string, unknown> = {}) =>
  WallNode.parse({ id, type: 'wall', start: [0, 0], end: [4, 0], ...extra })

const snapshotOf = (nodes: AnyNode[], roots: string[]): SceneSnapshot => ({
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<AnyNodeId, AnyNode>,
  rootNodeIds: roots.map(asId),
})

const only = (s: SceneSnapshot, type: string) =>
  Object.values(s.nodes).filter((n) => n.type === type)

describe('migrateToLevels', () => {
  it('空场景 → Site → Building → Level 0，root 只剩 site', () => {
    const out = migrateToLevels(snapshotOf([], []))

    const [site] = only(out, 'site')
    const [building] = only(out, 'building')
    const [level] = only(out, 'level')

    expect(site && building && level).toBeTruthy()
    expect(building!.parentId).toBe(site!.id)
    expect(level!.parentId).toBe(building!.id)
    expect(level!.type === 'level' && level!.level).toBe(0)
    expect(out.rootNodeIds).toEqual([site!.id])
  })

  it('层在创建处显式写了 height', () => {
    const [level] = only(migrateToLevels(snapshotOf([], [])), 'level')

    expect('height' in level!).toBe(true)
    expect(level!.type === 'level' && level!.height).toBe(DEFAULT_LEVEL_HEIGHT)
  })

  it('散在根下的节点被收进那一层：parentId 和 children 两侧都写对', () => {
    const a = wall('wall_a')
    const b = wall('wall_b')
    const out = migrateToLevels(snapshotOf([a, b], ['wall_a', 'wall_b']))
    const [level] = only(out, 'level')

    expect(out.nodes[asId('wall_a')]!.parentId).toBe(level!.id)
    expect(out.nodes[asId('wall_b')]!.parentId).toBe(level!.id)
    expect([...level!.children].sort()).toEqual(['wall_a', 'wall_b'])
    expect(out.rootNodeIds).toEqual([only(out, 'site')[0]!.id])
  })

  it('parentId 与 children 互为逆 —— 这个函数绕过了 addNode，索引得自己维护对', () => {
    const out = migrateToLevels(snapshotOf([wall('wall_a')], ['wall_a']))

    for (const node of Object.values(out.nodes)) {
      for (const childId of node.children) {
        expect(out.nodes[asId(childId)]!.parentId).toBe(node.id)
      }
      if (node.parentId !== null) {
        expect(out.nodes[asId(node.parentId)]!.children).toContain(node.id)
      }
    }
  })

  it('wall.height 的【缺席性】保住：没设过的仍然没有这个 key，设过的原样留着', () => {
    const plane = wall('wall_plane')
    const explicit = wall('wall_half', { height: 1.0 })
    const out = migrateToLevels(snapshotOf([plane, explicit], ['wall_plane', 'wall_half']))

    expect('height' in out.nodes[asId('wall_plane')]!).toBe(false)
    const half = out.nodes[asId('wall_half')]!
    expect(half.type === 'wall' && half.height).toBe(1.0)
  })

  it('墙上的门不受影响：门仍挂在墙上，墙的 children 仍含它', () => {
    const w = wall('wall_a')
    const door = DoorNode.parse({ id: 'door_x', parentId: 'wall_a', position: [1, 1.05, 0] })
    const withChild = { ...w, children: ['door_x'] } as AnyNode
    const out = migrateToLevels(snapshotOf([withChild, door], ['wall_a']))

    expect(out.nodes[asId('door_x')]!.parentId).toBe('wall_a')
    expect(out.nodes[asId('wall_a')]!.children).toEqual(['door_x'])
  })

  it('已经有层 → 原样返回（同一个对象），不会再建一套', () => {
    const level = LevelNode.parse({ id: 'level_0', type: 'level', level: 0, height: 2.5 })
    const input = snapshotOf([level], ['level_0'])

    expect(migrateToLevels(input)).toBe(input)
  })

  it('只有半套脚手架（有 site 没 level）也算迁过 —— 再补会变成两个 site', () => {
    const site = SiteNode.parse({ id: 'site_a', type: 'site' })
    const input = snapshotOf([site], ['site_a'])

    expect(migrateToLevels(input)).toBe(input)
    expect(only(migrateToLevels(input), 'site')).toHaveLength(1)
  })

  it('不改动入参：原来的 nodes / rootNodeIds / 节点对象都没被动过', () => {
    const a = wall('wall_a')
    const input = snapshotOf([a], ['wall_a'])
    const nodesBefore = input.nodes
    const rootsBefore = input.rootNodeIds

    migrateToLevels(input)

    expect(input.nodes).toBe(nodesBefore)
    expect(input.rootNodeIds).toBe(rootsBefore)
    expect(input.rootNodeIds).toEqual(['wall_a'])
    expect(input.nodes[asId('wall_a')]!.parentId).toBeNull()
    expect(Object.keys(input.nodes)).toEqual(['wall_a'])
  })

  it('rootNodeIds 里有已经删掉的 id → 跳过，不会往 children 里塞幽灵', () => {
    const out = migrateToLevels(snapshotOf([wall('wall_a')], ['wall_a', 'wall_gone']))
    const [level] = only(out, 'level')

    expect(level!.children).toEqual(['wall_a'])
  })
})