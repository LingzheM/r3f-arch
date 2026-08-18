import type { Point2D } from "../../lib/geometry-2d";
import { wallEnd, wallStart, type WallNode } from "../../schema/wall";
import { getWallMiterBoundaryPoints, hasJunctionAt, type MiterData } from "./wall-mitering";

export function getWallPlanFootprint(wall: WallNode, miter: MiterData): Point2D[] {
    const bp = getWallMiterBoundaryPoints(wall, miter)
    if (!bp) return []

    const start = wallStart(wall)
    const end = wallEnd(wall)

    const polygon: Point2D[] = [bp.startRight, bp.endRight]

    if (hasJunctionAt(wall, end, miter)) polygon.push(end)

    polygon.push(bp.endLeft, bp.startLeft)

    if (hasJunctionAt(wall, start, miter)) polygon.push(start)
    
    return polygon
}