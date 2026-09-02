import { describe, expect, it } from 'vitest'
import type { Point2D } from '../../lib/geometry-2d'
import { WallNode } from '../../schema/wall'
import { getWallPlanFootprint } from './wall-footprint'
import { calculateLevelMiters, getWallMiterBoundaryPoints } from './wall-mitering'

// 走 schema.parse：顺手验证 schema 本身，而且 id 可以指定，断言才好写。
const wall = (id: string, start: [number, number], end: [number, number], thickness = 0.2) =>
  WallNode.parse({ id: `wall_${id}`, type: 'wall', start, end, thickness, height: 2.5 })

const near = (a: Point2D, b: Point2D) => {
  expect(a.x).toBeCloseTo(b.x, 9)
  expect(a.y).toBeCloseTo(b.y, 9)
}

describe('直角 L 型 —— M2 §02 的算例', () => {
  const A = wall('a', [0, 0], [4, 0])
  const B = wall('b', [4, 0], [4, 4])
  const miter = calculateLevelMiters([A, B])

  it('A 的 end 端左右互换后落在正确一侧', () => {
    const bp = getWallMiterBoundaryPoints(A, miter)!
    // A 沿 +X，leftNormal = (0,1)，所以 left 侧是 y > 0
    near(bp.endLeft, { x: 3.9, y: 0.1 })
    near(bp.endRight, { x: 4.1, y: -0.1 })
    // 自由端保持平接
    near(bp.startLeft, { x: 0, y: 0.1 })
    near(bp.startRight, { x: 0, y: -0.1 })
  })

  it('B 的 start 端不互换', () => {
    const bp = getWallMiterBoundaryPoints(B, miter)!
    near(bp.startLeft, { x: 3.9, y: 0.1 })
    near(bp.startRight, { x: 4.1, y: -0.1 })
  })

  it('A 的轮廓是 5 点（一端斜接）', () => {
    expect(getWallPlanFootprint(A, miter)).toHaveLength(5)
  })
})

describe('闭合矩形', () => {
  const walls = [
    wall('n', [0, 0], [4, 0]),
    wall('e', [4, 0], [4, 3]),
    wall('s', [4, 3], [0, 3]),
    wall('w', [0, 3], [0, 0]),
  ]
  const miter = calculateLevelMiters(walls)

  it('每堵墙两端都斜接 → 轮廓 6 点', () => {
    for (const w of walls) expect(getWallPlanFootprint(w, miter)).toHaveLength(6)
  })

  it('外角在包围盒外，内角在包围盒内', () => {
    const bp = getWallMiterBoundaryPoints(walls[0]!, miter)!
    near(bp.startRight, { x: -0.1, y: -0.1 }) // 外角
    near(bp.startLeft, { x: 0.1, y: 0.1 })    // 内角
  })
})

describe('T 型', () => {
  // 直墙 main 横跨，stub 从中间垂直撞上来
  const main = wall('main', [0, 0], [6, 0])
  const stub = wall('stub', [3, 0], [3, 3])
  const miter = calculateLevelMiters([main, stub])

  it('撞上来的墙两侧都被切齐到 main 的表面', () => {
    const bp = getWallMiterBoundaryPoints(stub, miter)!
    // main 贡献正反两条腿，stub 夹在中间，左右各和其中一条求交，
    // 结果都是 main 的同一条边线 y = 0.1。
    // 只有一侧被切齐 ⟹ legsAtJunction 的 passthrough 只返回了一条腿。
    near(bp.startLeft, { x: 2.9, y: 0.1 })
    near(bp.startRight, { x: 3.1, y: 0.1 })
  })

  it('被撞的直墙几何不变（passthrough 不写回）', () => {
    const bp = getWallMiterBoundaryPoints(main, miter)!
    near(bp.startLeft, { x: 0, y: 0.1 })
    near(bp.endLeft, { x: 6, y: 0.1 })
    expect(getWallPlanFootprint(main, miter)).toHaveLength(4)
  })
})

describe('miter limit', () => {
  // 原项目的真实测试。没有 MITER_LIMIT 时 1° 那一档会算出几十米。
  it.each([90, 30, 10, 5, 1, 0.1, 0.01])('%s° 夹角下边界保持有界', (deg) => {
    const rad = (deg * Math.PI) / 180
    const walls = [
      wall('a', [0, 0], [3, 0]),
      wall('b', [0, 0], [3 * Math.cos(rad), 3 * Math.sin(rad)]),
    ]
    const miter = calculateLevelMiters(walls)
    for (const w of walls) {
      const bp = getWallMiterBoundaryPoints(w, miter)!
      for (const p of [bp.startLeft, bp.startRight, bp.endLeft, bp.endRight]) {
        expect(Number.isFinite(p.x)).toBe(true)
        expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeLessThan(4)
      }
    }
  })
})

describe('确定性', () => {
  it('同一场景算两次结果逐位相同（与输入顺序无关）', () => {
    const walls = [wall('a', [0, 0], [4, 0]), wall('b', [4, 0], [4, 4])]
    const one = getWallMiterBoundaryPoints(walls[0]!, calculateLevelMiters(walls))
    const two = getWallMiterBoundaryPoints(walls[0]!, calculateLevelMiters([...walls].reverse()))
    expect(one).toEqual(two)
  })
})
