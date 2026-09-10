import { describe, expect, it } from 'vitest'
import type { Point2D } from '../../lib/geometry-2d'
import { polygonArea } from '../../lib/polygon-2d'
import type { OpeningSpan } from '../../schema/opening'
import { clipPolygonByU, splitWallByOpenings } from './wall-openings'

const L = 4
const T = 0.1
const H = 2.5

/** 直墙的局部平面轮廓：x 沿墙 [0, L]，y 是横向偏移 ±T/2。原点在 start。 */
const RECT: Point2D[] = [
  { x: 0, y: T / 2 },
  { x: L, y: T / 2 },
  { x: L, y: -T / 2 },
  { x: 0, y: -T / 2 },
]

/** 起点有接头的斜接轮廓：5 点，中心线端点被顶出来成了第 5 个顶点。 */
const MITERED: Point2D[] = [
  { x: 0.05, y: T / 2 },
  { x: L, y: T / 2 },
  { x: L, y: -T / 2 },
  { x: -0.05, y: -T / 2 },
  { x: 0, y: 0 },
]

const span = (left: number, right: number, bottom: number, top: number): OpeningSpan => ({
  left,
  right,
  bottom,
  top,
})

const DOOR = span(1.05, 1.95, 0, 2.1) // 宽 0.9 高 2.1，坐地
const WINDOW = span(2.4, 3.6, 0.9, 2.1) // 宽 1.2 高 1.2，窗台 0.9

const bandVolume = (bands: ReturnType<typeof splitWallByOpenings>) =>
  bands.reduce((sum, b) => sum + polygonArea(b.polygon) * (b.topY - b.bottomY), 0)

describe('clipPolygonByU', () => {
  it('裁中段：4 点，面积按比例', () => {
    const clipped = clipPolygonByU(RECT, 1, 3)
    expect(clipped).toHaveLength(4)
    expect(polygonArea(clipped)).toBeCloseTo(polygonArea(RECT) * (2 / L), 10)
  })

  it('裁到区间外 → []', () => {
    expect(clipPolygonByU(RECT, 10, 12)).toEqual([])
  })

  it('区间跨过整个多边形 → 点数和面积都不变', () => {
    const clipped = clipPolygonByU(RECT, -1, L + 1)
    expect(clipped).toHaveLength(RECT.length)
    expect(polygonArea(clipped)).toBeCloseTo(polygonArea(RECT), 10)
  })

  it('uMin = -Infinity：只有右边界起作用', () => {
    const clipped = clipPolygonByU(RECT, Number.NEGATIVE_INFINITY, 1)
    expect(polygonArea(clipped)).toBeCloseTo(polygonArea(RECT) * (1 / L), 10)
  })

  it('斜接轮廓裁最左段：接头顶点被保住（5 点）', () => {
    const clipped = clipPolygonByU(MITERED, Number.NEGATIVE_INFINITY, 1)
    expect(clipped).toHaveLength(5)
  })

  it('绕向不变（有向面积同号）', () => {
    const clipped = clipPolygonByU(RECT, 1, 3)
    const sign = (pts: Point2D[]) => {
      let sum = 0
      for (let i = 0; i < pts.length; i += 1) {
        const p = pts[i]!
        const q = pts[(i + 1) % pts.length]!
        sum += p.x * q.y - q.x * p.y
      }
      return Math.sign(sum)
    }
    expect(sign(clipped)).toBe(sign(RECT))
  })
})

describe('splitWallByOpenings', () => {
  it('无洞 → 1 段，多边形原样', () => {
    const bands = splitWallByOpenings(RECT, H, [])
    expect(bands).toHaveLength(1)
    expect(bands[0]!.bottomY).toBe(0)
    expect(bands[0]!.topY).toBe(H)
    expect(polygonArea(bands[0]!.polygon)).toBeCloseTo(polygonArea(RECT), 10)
  })

  it('一个门（sill = 0）→ 3 段，没有窗台段', () => {
    const bands = splitWallByOpenings(RECT, H, [DOOR])
    expect(bands).toHaveLength(3)
    expect(bands.filter((b) => b.bottomY === 0 && b.topY === H)).toHaveLength(2)
    expect(bands.filter((b) => b.bottomY === DOOR.top)).toHaveLength(1)
  })

  it('一个窗 → 4 段（窗台 + 过梁都在）', () => {
    const bands = splitWallByOpenings(RECT, H, [WINDOW])
    expect(bands).toHaveLength(4)
    expect(bands.some((b) => b.bottomY === 0 && b.topY === WINDOW.bottom)).toBe(true)
    expect(bands.some((b) => b.bottomY === WINDOW.top && b.topY === H)).toBe(true)
  })

  it('一门一窗 → 6 段', () => {
    expect(splitWallByOpenings(RECT, H, [DOOR, WINDOW])).toHaveLength(6)
  })

  it('洞的顺序不影响结果', () => {
    const a = splitWallByOpenings(RECT, H, [DOOR, WINDOW])
    const b = splitWallByOpenings(RECT, H, [WINDOW, DOOR])
    expect(bandVolume(a)).toBeCloseTo(bandVolume(b), 10)
    expect(a).toHaveLength(b.length)
  })

  it('洞贴左端 → 2 段，不产生零宽段', () => {
    const bands = splitWallByOpenings(RECT, H, [span(0, 0.9, 0, 2.1)])
    expect(bands).toHaveLength(2)
    for (const band of bands) {
      expect(polygonArea(band.polygon)).toBeGreaterThan(0)
      expect(band.topY - band.bottomY).toBeGreaterThan(0)
    }
  })

  it('洞贴右端 → 2 段', () => {
    expect(splitWallByOpenings(RECT, H, [span(L - 0.9, L, 0, 2.1)])).toHaveLength(2)
  })

  it('洞比墙宽 → 空列表（不是抛错）', () => {
    expect(splitWallByOpenings(RECT, H, [span(-1, L + 1, 0, H)])).toEqual([])
  })

  it('两个洞重叠 → 合并成一个区间，不是 5 段', () => {
    const bands = splitWallByOpenings(RECT, H, [span(1, 2, 0, 2.1), span(1.5, 2.5, 0, 2.1)])
    expect(bands).toHaveLength(3)
  })

  it('两个洞相邻但不重叠 → 中间那段实墙在', () => {
    const bands = splitWallByOpenings(RECT, H, [span(1, 1.5, 0, 2.1), span(2, 2.5, 0, 2.1)])
    const fullHeight = bands.filter((b) => b.bottomY === 0 && b.topY === H)
    expect(fullHeight).toHaveLength(3)
  })

  it('I2 · 体积守恒：Σ 段体积 === 墙体积 − Σ 洞体积', () => {
    const bands = splitWallByOpenings(RECT, H, [DOOR, WINDOW])
    const doorVolume = (DOOR.right - DOOR.left) * T * (DOOR.top - DOOR.bottom)
    const windowVolume = (WINDOW.right - WINDOW.left) * T * (WINDOW.top - WINDOW.bottom)
    expect(bandVolume(bands)).toBeCloseTo(polygonArea(RECT) * H - doorVolume - windowVolume, 10)
  })

  it('I2 · 斜接轮廓上同样守恒（斜接没被裁掉）', () => {
    const bands = splitWallByOpenings(MITERED, H, [DOOR])
    const holeArea = polygonArea(clipPolygonByU(MITERED, DOOR.left, DOOR.right))
    expect(bandVolume(bands)).toBeCloseTo(
      polygonArea(MITERED) * H - holeArea * (DOOR.top - DOOR.bottom),
      10,
    )
  })

  it('墙高为 0 → 空列表', () => {
    expect(splitWallByOpenings(RECT, 0, [DOOR])).toEqual([])
  })
})