import { describe, expect, it } from 'vitest'
import { selectableKinds } from '../../core/registry/node-registry'
import { nodeRegistry, registerAllNodes } from './register'

describe('registerAllNodes', () => {
  it('九种 kind 全部注册', () => {
    registerAllNodes()

    expect([...nodeRegistry.entries()].map(([kind]) => kind).sort()).toEqual([
      'building', 'ceiling', 'column', 'door', 'level', 'site', 'slab', 'wall', 'window',
    ])
  })

  it('三个容器不可选中，六个叶子可选中', () => {
    registerAllNodes()

    expect(selectableKinds().sort()).toEqual([
      'ceiling', 'column', 'door', 'slab', 'wall', 'window',
    ])
  })

  it('层走 def.renderer，不走 def.frame，也没有 geometry', () => {
    registerAllNodes()
    const level = nodeRegistry.get('level')!

    expect(level.renderer).toBeDefined()
    expect(level.frame).toBeUndefined()
    expect(level.geometry).toBeUndefined()
  })

  it('site / building 三样都没有：纯容器', () => {
    registerAllNodes()

    for (const kind of ['site', 'building'] as const) {
      const def = nodeRegistry.get(kind)!
      expect(def.renderer).toBeUndefined()
      expect(def.frame).toBeUndefined()
      expect(def.geometry).toBeUndefined()
    }
  })

  it('重复调用是幂等的（registered 闸门）', () => {
    registerAllNodes()
    const size = nodeRegistry.size
    registerAllNodes()

    expect(nodeRegistry.size).toBe(size)
  })
})