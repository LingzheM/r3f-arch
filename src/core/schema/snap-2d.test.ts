import { describe, expect, it } from "vitest";
import { ENDPOINT_SNAP_RADIUS, nearestEndpoint, snapPoint, snapPointDetailed, snapToGrid } from "./snap-2d";
import { WallNode } from "./wall";
import type { AnyNodeId } from "./types";

const wall = WallNode.parse({ id: 'wall_a', type: 'wall', start: [0, 0], end: [4, 0] })
const walls = [wall]

describe('snapToGrid', () => {
  it('四舍五入到 0.1 m', () => {
    const p = snapToGrid({ x: 1.23, y: -0.47 })
    // 用 closeTo 不用 toEqual：Math.round(1.23 / 0.1) * 0.1 === 1.2000000000000002。
    // 这个浮点脏值是 M4 起的既有行为，M10 不动它（理由见本文件开头「实测发现」第 2 条）。
    expect(p.x).toBeCloseTo(1.2, 10)
    expect(p.y).toBeCloseTo(-0.5, 10)
  })

  it('步长 ≤ 0 时原样返回（不许除以零）', () => {
    expect(snapToGrid({ x: 1.23, y: 4.56 }, 0)).toEqual({ x: 1.23, y: 4.56 })
  })
})

describe('snapPointDetailed（I6）', () => {
  it('落在端点半径内 → kind 是 endpoint，点就是那个端点', () => {
    const r = snapPointDetailed({ x: 4.05, y: 0.05 }, walls)
    expect(r.kind).toBe('endpoint')
    expect(r.point).toEqual({ x: 4, y: 0 })
  })

  it('离端点远 → kind 是 grid，点落在网格上', () => {
    const r = snapPointDetailed({ x: 2.03, y: 1.44 }, walls)
    expect(r.kind).toBe('grid')
    expect(r.point.x).toBeCloseTo(2, 10)
    expect(r.point.y).toBeCloseTo(1.4, 10)
  })

  it('没有墙的时候一律是 grid', () => {
    expect(snapPointDetailed({ x: 1.01, y: 1.01 }, []).kind).toBe('grid')
  })

  it('被 ignoreIds 排除的墙不参与吸附 —— 拖自己的端点时不会吸到自己', () => {
    const ignore = new Set<AnyNodeId>([wall.id])
    const r = snapPointDetailed({ x: 4.02, y: 0.02 }, walls, { ignoreIds: ignore })
    expect(r.kind).toBe('grid')
  })

  it('正好落在半径上算命中（和 polygon-draft 的 isClosingClick 用同一个边界）', () => {
    const r = snapPointDetailed({ x: ENDPOINT_SNAP_RADIUS, y: 0 }, walls)
    expect(r.kind).toBe('endpoint')
    expect(r.point).toEqual({ x: 0, y: 0 })
  })

  it('两个端点都在半径内时取更近的那个', () => {
    const shortWall = WallNode.parse({ id: 'wall_b', type: 'wall', start: [0, 0], end: [0.4, 0] })
    const r = snapPointDetailed({ x: 0.25, y: 0 }, [shortWall])
    expect(r.point).toEqual({ x: 0.4, y: 0 })
  })
})

describe('snapPoint 的返回值没变（M4 的吸附回归）', () => {
  it('和 snapPointDetailed().point 逐点相等', () => {
    const probes = [
      { x: 4.05, y: 0.05 },
      { x: 2.03, y: 1.44 },
      { x: -3.33, y: 7.77 },
      { x: 0, y: 0 },
    ]
    for (const p of probes) {
      expect(snapPoint(p, walls)).toEqual(snapPointDetailed(p, walls).point)
    }
  })

  it('仍然是「先端点、后网格」的顺序', () => {
    expect(snapPoint({ x: 4.05, y: 0.05 }, walls)).toEqual({ x: 4, y: 0 })
    expect(nearestEndpoint({ x: 2.03, y: 1.44 }, walls)).toBeNull()
    expect(snapPoint({ x: 2.03, y: 1.44 }, walls).x).toBeCloseTo(2, 10)
  })
})