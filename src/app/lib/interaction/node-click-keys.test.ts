import { describe, expect, it } from "vitest";
import { nodeClickKeys } from "./node-click-keys";

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
})