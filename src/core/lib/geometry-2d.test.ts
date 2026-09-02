import { describe, expect, it } from 'vitest'
import {
  intersectLines,
  leftNormal,
  lineFromPointAndDirection,
  normalize,
  type Point2D,
  pointOnSegment,
  quantizeKey,
  sub,
  wallFootprint,
} from './geometry-2d'

// 用 toBeCloseTo 而不是 toEqual：v.y === 0 时 `-v.y` 是 -0，
// 而 toEqual 对 -0 / +0 的处理会咬你一口。
const near = (a: Point2D, b: Point2D) => {
  expect(a.x).toBeCloseTo(b.x, 10)
  expect(a.y).toBeCloseTo(b.y, 10)
}

describe('leftNormal', () => {
  it('+X 的左法线是 +Y', () => near(leftNormal({ x: 1, y: 0 }), { x: 0, y: 1 }))
  it('+Y 的左法线是 -X', () => near(leftNormal({ x: 0, y: 1 }), { x: -1, y: 0 }))
})

describe('normalize', () => {
  it('零向量不返回 NaN', () => {
    const r = normalize({ x: 0, y: 0 })
    expect(Number.isNaN(r.x)).toBe(false)
    expect(Number.isNaN(r.y)).toBe(false)
  })
})

describe('wallFootprint', () => {
  it('轴对齐墙：顺序与半厚', () => {
    const f = wallFootprint({ x: 0, y: 0 }, { x: 4, y: 0 }, 0.2)
    expect(f).toHaveLength(4)
    near(f[0]!, { x: 0, y: 0.1 })   // startLeft
    near(f[1]!, { x: 4, y: 0.1 })   // endLeft
    near(f[2]!, { x: 4, y: -0.1 })  // endRight
    near(f[3]!, { x: 0, y: -0.1 })  // startRight
  })

  it('退化墙返回空', () => {
    expect(wallFootprint({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.2)).toEqual([])
  })

  it('斜墙的厚度不被拉伸', () => {
    const start = { x: 0, y: 0 }
    const end = { x: 3, y: 4 } // 长度 5
    const dir = normalize(sub(end, start))
    for (const p of wallFootprint(start, end, 1)) {
      const d = sub(p, start)
      // 点到中心线的垂距 = |cross(dir, p - start)|
      expect(Math.abs(dir.x * d.y - dir.y * d.x)).toBeCloseTo(0.5, 10)
    }
  })
})

describe('intersectLines', () => {
  const horizontal = (y: number) => lineFromPointAndDirection({ x: 0, y }, { x: 1, y: 0 })
  const vertical = (x: number) => lineFromPointAndDirection({ x, y: 0 }, { x: 0, y: 1 })

  it('垂直相交', () => near(intersectLines(horizontal(0), vertical(0))!, { x: 0, y: 0 }))

  it('M2 算例的两个墙角', () => {
    near(intersectLines(vertical(3.9), horizontal(0.1))!, { x: 3.9, y: 0.1 })
    near(intersectLines(horizontal(-0.1), vertical(4.1))!, { x: 4.1, y: -0.1 })
  })

  it('平行返回 null', () => {
    expect(intersectLines(horizontal(0), horizontal(1))).toBeNull()
  })
})

describe('pointOnSegment', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 4, y: 0 }
  it('中间的点算 T 接', () => expect(pointOnSegment({ x: 2, y: 0 }, a, b)).toBe(true))
  it('端点不算（开区间）', () => expect(pointOnSegment(a, a, b)).toBe(false))
  it('延长线上的点不算', () => expect(pointOnSegment({ x: 5, y: 0 }, a, b)).toBe(false))
  it('平行偏移的点不算', () => expect(pointOnSegment({ x: 2, y: 1 }, a, b)).toBe(false))
  it('1mm 内的偏移仍然算', () => expect(pointOnSegment({ x: 2, y: 0.0005 }, a, b)).toBe(true))
})

describe('quantizeKey', () => {
  it('半毫米内的两点同键', () => {
    expect(quantizeKey({ x: 1, y: 2 })).toBe(quantizeKey({ x: 1.0004, y: 2 }))
  })
  it('跨格的两点不同键', () => {
    expect(quantizeKey({ x: 1.0004, y: 0 })).not.toBe(quantizeKey({ x: 1.0006, y: 0 }))
  })
})
