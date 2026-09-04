import { describe, expect, it } from 'vitest'
import type { Point2D } from './geometry-2d'
import { polygonArea, signedArea } from './polygon-2d'

const p = (x: number, y: number): Point2D => ({ x, y })

// 4×3 的矩形，逆时针（在世界 XZ 里看）
const RECT = [p(0, 0), p(4, 0), p(4, 3), p(0, 3)]

describe('signedArea', () => {
  it('矩形的面积是长乘宽', () => {
    expect(polygonArea(RECT)).toBeCloseTo(12)
  })

  it('反向绕行，符号相反、绝对值相同', () => {
    const reversed = [...RECT].reverse()
    expect(signedArea(reversed)).toBeCloseTo(-signedArea(RECT))
    expect(polygonArea(reversed)).toBeCloseTo(polygonArea(RECT))
  })

  it('三点共线 → 0', () => {
    expect(polygonArea([p(0, 0), p(1, 0), p(2, 0)])).toBeCloseTo(0)
  })

  it('少于三个点 → 0', () => {
    expect(polygonArea([p(0, 0), p(1, 1)])).toBe(0)
    expect(polygonArea([])).toBe(0)
  })

  it('凹多边形（L 形）也对', () => {
    // 4×4 的正方形挖掉右上角 2×2 → 16 - 4 = 12
    const L = [p(0, 0), p(4, 0), p(4, 2), p(2, 2), p(2, 4), p(0, 4)]
    expect(polygonArea(L)).toBeCloseTo(12)
  })

  it('首尾重复一个点不影响面积', () => {
    expect(polygonArea([...RECT, p(0, 0)])).toBeCloseTo(12)
  })
})