import { describe, expect, it } from "vitest";
import { formatMetres, RULER_STEPS, rulerTicks } from "./ruler";

describe('rulerTicks (I7)', () => {
  it('步长只能是候选表里的值', () => {
    for (const px of [5, 20, 60, 100, 400, 2000]) {
      expect(RULER_STEPS).toContain(rulerTicks(0, 10, px).step)
    }
  })

  it('取第一个够疏的步长，不是更疏的那个', () => {
    expect(rulerTicks(0, 10, 100, 48).step).toBe(0.5)
    expect(rulerTicks(0, 10, 500, 48).step).toBe(0.1)
  })

  it('选中的步长一定满足 minPx (除非连最稀疏的 10 m 都不够)', () => {
    for (const px of [60, 100, 500, 2000]) {
      const { step } = rulerTicks(0, 10, px, 48)
      expect(step * px).toBeGreaterThanOrEqual(48)
    }
  })

  it('缩小到 10 px/m 时跳到 5 m 一格', () => {
    expect(rulerTicks(0, 100, 10).step).toBe(5)
  })

  it('第一个刻度 >= min, 最后一个 <= max', () => {
    const { ticks } = rulerTicks(-3.3, 7.7, 100)
    expect(ticks[0]).toBeGreaterThanOrEqual(-3.3)
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(7.7)
  })

  it('刻度升序，等距，没有浮点脏值', () => {
    const { step, ticks } = rulerTicks(0, 1, 600)
    expect(step).toBe(0.1)
    expect(ticks).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
    expect(ticks).not.toContain(0.30000000000000004)
  })
})

describe('formatMetres (I8)', () => {
  it('两位小数', () => {
    expect(formatMetres(3.14159)).toBe('3.14m')
    expect(formatMetres(3)).toBe('3.00 m')
  })

  it('不出 -0.00', () => {
    expect(formatMetres(-0.001)).toBe('0.00 m')
    expect(formatMetres(-0)).toBe('0.00 m')
  })

  it('真的负号照常带负号', () => {
    expect(formatMetres(-1.4)).toBe('-1.40m')
  })

  it('NaN / Infinity 不往标签里漏')
})