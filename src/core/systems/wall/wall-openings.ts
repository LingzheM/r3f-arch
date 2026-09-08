import type { Point2D } from "../../lib/geometry-2d"

export const BAND_EPISON = 1e-6

export const BAND_AREA_EPSILON = 1e-12

export type WallBand = {
  polygon: Point2D[]
  bottomY: number
  topY: number
}

export function clipPolygonByU(
  polygon: readonly Point2D[],
  uMin: number,
  uMax: number,
): Point2D[] {
  const lower = clipHalfPlane(polygon, uMin, true)
}


function clipHalfPlane(
  polygon: readonly Point2D[],
  cutX: number,
  keepGreater: boolean,
): Point2D[] {
  if (polygon.length === 0) return []

  const inside = (p: Point2D) => (keepGreater ? p.x >= cutX : p.x <= cutX)
  const out: Point2D[] = []

  const push = (p: Point2D) => {
    const last = out[out.length - 1]
    if (last && samePoint(last, p)) return
    out.push(p)
  }

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]!
    const next = polygon[(i + 1) % polygon.length]!
    const currentInside = inside(current)

    if (currentInside) push(current)
    if (currentInside === inside(next)) continue

    const dx = next.x - current.x
    if (Math.abs(dx) < Number.EPSILON) continue

    const t = (cutX - current.x) / dx
    push({ x: cutX, y: current.y + (next.y - current.y) * t })
  }

  while (out.length > 1 && samePoint(out[0]!, out[out.length - 1]!)) out.pop()

  return out
}


function samePoint(a: Point2D, b: Point2D): boolean {
  return Math.abs(a.x - b.x) < BAND_AREA_EPSILON && Math.abs(a.y - b.y) < BAND_AREA_EPSILON
}