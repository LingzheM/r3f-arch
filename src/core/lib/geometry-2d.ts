export type Point2D = { x:number; y:number }

export const EPSILON = 1e-9

export const sub = (a: Point2D, b: Point2D): Point2D => ({ x: a.x - b.x, y: a.y - b.y })

export const add = (a: Point2D, b: Point2D): Point2D => ({ x: a.x + b.x, y: a.y + b.y })

export const scale = (v: Point2D, k: number): Point2D => ({ x: v.x * k, y: v.y * k })

export const len = (v: Point2D): number => Math.hypot(v.x, v.y)

export const midpoint = (a: Point2D, b: Point2D) => 
  ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export function normalize(v: Point2D): Point2D {
    const l = len(v)
    if (l < EPSILON) return { x: 0, y: 0 }
    return { x: v.x / l, y: v.y / l }
}

export function leftNormal(v: Point2D): Point2D {
    return normalize({ x: -v.y, y: v.x })
}

export function wallFootprint(start: Point2D, end: Point2D, thickness: number): Point2D[] {
    const v = sub(end, start)
    if (len(v) < EPSILON) return []
    const n = scale(leftNormal(v), thickness / 2)
    return [add(start, n), add(end, n), sub(end, n), sub(start, n)]
}