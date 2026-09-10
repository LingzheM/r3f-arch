import type { Point2D } from "../../lib/geometry-2d"
import { polygonArea } from "../../lib/polygon-2d"
import type { OpeningSpan } from "../../schema/opening"

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
  const clipped = clipHalfPlane(lower, uMax, false)
  return clipped.length < 3 ? [] : clipped
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

export function splitWallByOpenings(
  footprint: readonly Point2D[],
  wallHeight: number,
  openings: readonly OpeningSpan[],
): WallBand[] {
  if (footprint.length < 3 || wallHeight <= BAND_EPISON) return []

  const spans = mergeOpeningSpans(openings)
  const bands: WallBand[] = []

  let cursor = Number.NEGATIVE_INFINITY
  for (const span of spans) {
    pushBand(bands, footprint, cursor, span.left, 0, wallHeight)
    pushBand(bands, footprint, span.left, span.right, 0, span.bottom)
    pushBand(bands, footprint, span.left, span.right, span.top, wallHeight)
    cursor = span.right
  }
  pushBand(bands, footprint, cursor, Number.POSITIVE_INFINITY, 0, wallHeight)

  return bands
}

function pushBand(
  bands: WallBand[],
  footprint: readonly Point2D[],
  uMin: number,
  uMax: number,
  bottomY: number,
  topY: number,
): void {
  if (topY - bottomY <= BAND_EPISON) return
  if (uMax - uMin <= BAND_EPISON) return

  const polygon = clipPolygonByU(footprint, uMin, uMax)
  if (polygon.length < 3 || polygonArea(polygon) <= BAND_AREA_EPSILON) return

  bands.push({ polygon, bottomY, topY })
}

function mergeOpeningSpans(openings: readonly OpeningSpan[]): OpeningSpan[] {
  const sorted = openings
    .filter((o) => o.right - o.left > BAND_EPISON && o.top - o.bottom > BAND_EPISON)
    .slice()
    .sort((a, b) => a.left - b.left)

  const merged: OpeningSpan[] = []

  for (const span of sorted) {
    const last = merged[merged.length - 1]
    if (last && span.left <= last.right + BAND_EPISON) {
      merged[merged.length - 1] = {
        left: last.left,
        right: Math.max(last.right, span.right),
        bottom: Math.min(last.bottom, span.bottom),
        top: Math.max(last.top, span.top),
      }
      continue
    }
    merged.push({ ...span })
  }

  return merged
}