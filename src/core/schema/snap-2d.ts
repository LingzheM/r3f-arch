import { type Point2D } from "../lib/geometry-2d"
import { wallEnd, WallNode, wallStart } from "./wall"
import type { AnyNodeId } from "./types"

export const DEFAULT_GRID_STEP = 0.1
export const ENDPOINT_SNAP_RADIUS = 0.35

export type SnapOptions = {
    ignoreIds?: ReadonlySet<AnyNodeId>
    radius?: number
    step?: number
}

export function snapToGrid(p: Point2D, step: number = DEFAULT_GRID_STEP): Point2D {
    if (!(step > 0)) return p
    return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step }
}

export function nearestEndpoint(
    p: Point2D,
    walls: readonly WallNode[],
    options?: SnapOptions,
): Point2D | null {
    const ignoreIds = options?.ignoreIds
    const radius = options?.radius ?? ENDPOINT_SNAP_RADIUS
    const radiusSquared = radius * radius

    let best: Point2D | null = null
    let bestDistanceSquared = Number.POSITIVE_INFINITY

    for (const wall of walls) {
        if (ignoreIds?.has(wall.id)) continue

        for (const candidate of [wallStart(wall), wallEnd(wall)]) {
            const dx = candidate.x - p.x
            const dy = candidate.y - p.y
            const distanceSquared = dx * dx + dy * dy
            if (distanceSquared > radiusSquared || distanceSquared >= bestDistanceSquared) continue

            best = candidate
            bestDistanceSquared = distanceSquared
        }
    }

    return best
}

export function snapPoint(
    p: Point2D,
    walls: readonly WallNode[],
    options?: SnapOptions,
): Point2D {
    return nearestEndpoint(p, walls, options) ?? snapToGrid(p, options?.step)
}