import { beforeEach, describe, expect, it } from 'vitest'
import type { AnyNode, AnyNodeType } from '../schema/types'
import type { NodeDefinition } from './node-definition'
import { nodeRegistry, registerNode, resetNodeRegistry, selectableKinds } from './node-registry'

// 只有 kind 的桩定义。geometry 在前置 C · A8 之后是可选的，
// 所以 core 的测试不需要 import three —— D4 的边界不用破例。
const stub = (kind: AnyNodeType): NodeDefinition<AnyNode, unknown> => ({ kind })

describe('nodeRegistry', () => {
  // ⚠ 没有这一句，第二个 it 会撞重名直接抛。
  beforeEach(() => resetNodeRegistry())

  it('注册之后 has / get 拿得到', () => {
    registerNode(stub('slab'))
    expect(nodeRegistry.has('slab')).toBe(true)
    expect(nodeRegistry.get('slab')?.kind).toBe('slab')
  })

  it('没注册的 kind 返回 undefined', () => {
    expect(nodeRegistry.has('column')).toBe(false)
    expect(nodeRegistry.get('column')).toBeUndefined()
  })

  it('重复注册同一个 kind 抛错', () => {
    registerNode(stub('wall'))
    expect(() => registerNode(stub('wall'))).toThrow(/wall/)
  })

  it('size 和 entries 反映已注册的全部', () => {
    registerNode(stub('wall'))
    registerNode(stub('slab'))
    registerNode(stub('ceiling'))

    expect(nodeRegistry.size).toBe(3)
    expect([...nodeRegistry.entries()].map(([kind]) => kind).sort())
      .toEqual(['ceiling', 'slab', 'wall'])
  })

  it('reset 之后是空的', () => {
    registerNode(stub('wall'))
    resetNodeRegistry()
    expect(nodeRegistry.size).toBe(0)
    expect(nodeRegistry.has('wall')).toBe(false)
  })
})
describe('selectableKinds（M8 批 D）', () => {
  beforeEach(() => resetNodeRegistry())

  it('不声明 selectable 的 kind 默认可选中', () => {
    registerNode(stub('wall'))
    registerNode(stub('slab'))

    expect(selectableKinds().sort()).toEqual(['slab', 'wall'])
  })

  it('selectable: false 的 kind 被排除', () => {
    registerNode(stub('wall'))
    registerNode({ ...stub('level'), selectable: false })
    registerNode({ ...stub('building'), selectable: false })

    expect(selectableKinds()).toEqual(['wall'])
  })

  it('显式 selectable: true 仍然在列表里', () => {
    registerNode({ ...stub('column'), selectable: true })

    expect(selectableKinds()).toEqual(['column'])
  })
})