import type { Point2D } from "../../../core/lib/geometry-2d"
import { polygonArea } from "../../../core/lib/polygon-2d"

export const CLOSE_RADIUS = 0.25

export const MIN_POLYGON_AREA = 1e-4

export function isClosingClick(points: readonly Point2D[], p: Point2D): boolean {
  if (points.length < 3) return false
  const first = points[0]!

  return Math.hypot(p.x - first.x, p.y - first.y) <= CLOSE_RADIUS
}

export function isCommittablePolygon(points: readonly Point2D[]): boolean {
  return points.length >= 3 && polygonArea(points) > MIN_POLYGON_AREA
}

export function toPolygonTuples(points: readonly Point2D[]): [number, number][] {
  return points.map((p) => [p.x, p.y])
}