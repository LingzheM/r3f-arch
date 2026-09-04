import { describe, expect, it } from 'vitest'
import type { Point2D } from '../../../core/lib/geometry-2d'
import {
  CLOSE_RADIUS,
  isClosingClick,
  isCommittablePolygon,
  toPolygonTuples,
} from './polygon-draft'

const p = (x: number, y: number): Point2D => ({ x, y })
const TRIANGLE = [p(0, 0), p(2, 0), p(2, 2)]

describe('isClosingClick', () => {
  it('三个点之后，点回起点附近 → 闭合', () => {
    expect(isClosingClick(TRIANGLE, p(0.1, 0.1))).toBe(true)
  })

  it('离起点太远 → 不闭合', () => {
    expect(isClosingClick(TRIANGLE, p(1, 1))).toBe(false)
  })

  it('刚好在半径上 → 闭合（含等号）', () => {
    expect(isClosingClick(TRIANGLE, p(CLOSE_RADIUS, 0))).toBe(true)
  })

  it('不足三个点时，点回起点不算闭合 —— 那是在画很小的板', () => {
    expect(isClosingClick([p(0, 0), p(0.05, 0)], p(0, 0))).toBe(false)
    expect(isClosingClick([p(0, 0)], p(0, 0))).toBe(false)
    expect(isClosingClick([], p(0, 0))).toBe(false)
  })
})

describe('isCommittablePolygon', () => {
  it('正常三角形可以提交', () => {
    expect(isCommittablePolygon(TRIANGLE)).toBe(true)
  })

  it('三点共线不能提交', () => {
    expect(isCommittablePolygon([p(0, 0), p(1, 0), p(2, 0)])).toBe(false)
  })

  it('少于三个点不能提交', () => {
    expect(isCommittablePolygon([p(0, 0), p(1, 1)])).toBe(false)
  })

  it('所有点重合不能提交', () => {
    expect(isCommittablePolygon([p(1, 1), p(1, 1), p(1, 1)])).toBe(false)
  })
})

describe('toPolygonTuples', () => {
  it('Point2D.y 落进元组的第二位（世界 Z）', () => {
    expect(toPolygonTuples(TRIANGLE)).toEqual([[0, 0], [2, 0], [2, 2]])
  })
})