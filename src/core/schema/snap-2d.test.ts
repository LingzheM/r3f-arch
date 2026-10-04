import { describe, expect, it } from "vitest";
import { snapPointDetailed, snapToGrid } from "./snap-2d";
import { WallNode } from "./wall";

const wall = WallNode.parse({ id: 'wall_a', type: 'wall', start: [0, 0], end: [4, 0] })
const walls = [wall]

describe('snapToGrid', () => {
  it('四舍五入到 0.1 m', () => {
    const p = snapToGrid({ x: 1.23, y: -0.47 })
    expect(p.x).toBeCloseTo(1.2, 10)
    expect(p.y).toBeCloseTo(-0.5, 10)
  })

  it('步长 <= 0 时原样返回（不许除以0', () => {
    expect(snapToGrid({ x: 1.23, y: 4.56 })).toEqual({ x: 1.23, y: 4.56 })
  })
})

describe('snapPointDetailed', () => {
  it('落在端点半径内 → kind 是 endpoint，点就是那个端点', () => {
    const r = snapPointDetailed({ x: 4.05, y: 0.05 }, walls)
    expect(r.kind).toBe('endpoint')
    expect(r.point).toEqual({ x: 4, y: 0 })
  })
})