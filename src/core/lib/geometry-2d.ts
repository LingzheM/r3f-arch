export type Point2D = { x:number; y:number }

export type Line = { a: number; b: number; c: number }

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

export function lineFromPointAndDirection(p: Point2D, v: Point2D): Line {
    const a = -v.y
    const b = v.x
    return {a, b, c: -(a * p.x + b * p.y) }
}

export function intersectLines(l1: Line, l2: Line): Point2D | null {
    const det = l1.a * l2.b - l2.a * l1.b
    if (Math.abs(det) < EPSILON) return null

    const x = (l1.b * l2.c - l2.b * l1.c) / det
    const y = (l2.a * l1.c - l1.a * l2.c) / det

    return {x, y}
}

export function pointOnSegment(p: Point2D, a: Point2D, b: Point2D, tol=1e-3): boolean {
    const ab = sub(b, a)
    const L2 = ab.x * ab.x + ab.y * ab.y
    if (L2 < EPSILON) return false
    const L = Math.sqrt(L2)
    const ap = sub(p, a)

    const t = (ab.x * ap.x + ab.y * ap.y) / L2
    const tTol = tol / L
    if (t <= tTol || t >= 1 - tTol) return false
    
    return Math.abs(ab.x * ap.y - ab.y * ap.x) / L < tol
}

export function quantizeKey(p: Point2D, tol = 1e-3): string {
    return `${Math.round(p.x / tol)},${Math.round(p.y / tol)}`
}