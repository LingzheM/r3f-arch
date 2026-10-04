import { describe, expect, it } from "vitest";
import { nodeClickKeys } from "./node-click-keys";
import type { NodeEventKey } from "../../../core/events/types";

describe('nodeClickKeys (I1 D36)', () => {
  it('每个kind配一个完整的事件键', () => {
    expect(nodeClickKeys(['wall', 'slab'])).toEqual(['wall:click', 'slab:click'])
  })

  it('空列表给空列表', () => {
    expect(nodeClickKeys([])).toEqual([])
  })

  it('键是完整的kind, 不是首字母', () => {
    for (const key of nodeClickKeys(['wall', 'ceiling', 'column', 'door', 'window'])) {
      expect(key.split(':')[0]!.length).toBeGreaterThan(1)
    }
  })

  it('顺序和传进来的一致（监听和退订要一一对应）', () => {
    expect(nodeClickKeys(['door', 'window', 'wall'])).toEqual([
      'door:click', 'window:click', 'wall:click',
    ])
  })

  it('类型层：传 string[] 编译不过', () => {
    const loose: string[] = ['wall']
    // @ts-expect-error string 不是 AnyNodeType —— 这一条红了说明护栏被人拆了
    nodeClickKeys(loose)
    expect(loose).toEqual(['wall'])
  })

  it('类型层：把元素当 [kind, def] 解构编译不过（D36 的原样复现）', () => {
    // @ts-expect-error 解构出来的 kind 是 string，模板串推成 string，赋不进 NodeEventKey[]
    const broken: NodeEventKey[] = (['wall', 'slab'] as const).map(([kind]) => `${kind}:click`)
    // 而且运行时拿到的是首字母 —— 这就是 2026-09-24 在浏览器里读出来的那组键
    expect(broken).toEqual(['w:click', 's:click'])
  })
})