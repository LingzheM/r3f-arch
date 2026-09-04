import type { Point2D } from "./geometry-2d";

export function signedArea(polygon: readonly Point2D[]): number {
  if (polygon.length < 3) return 0

  let sum = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const p = polygon[i]!
    const q = polygon[(i + 1) % polygon.length]!
    sum += p.x * q.y - q.x * p.y
  }
  return sum / 2
}

export function polygonArea(polygon: readonly Point2D[]): number {
  return Math.abs(signedArea(polygon))
}