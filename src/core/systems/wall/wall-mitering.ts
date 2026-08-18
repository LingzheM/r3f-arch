import { EPSILON } from "three/tsl"
import { add, leftNormal, len, lineFromPointAndDirection, pointOnSegment, quantizeKey, scale, sub, type Line, type Point2D } from "../../lib/geometry-2d"
import { getWallThickness, wallEnd, wallStart, type WallNode } from "../../schema/wall"

const JUNCTION_TOLERANCE = 1e-3

const MITER_LIMIT = 10

type EndType = 'start' | 'end' | 'passthrough'

interface Junction {
    meetingPoint: Point2D
    connected: Array<{wall: WallNode; endType: EndType}>
}

interface Leg {
    wallId: string
    angle: number   // 出射角
    edgeLeft: Line
    edgeRight: Line
    isPassthrough: boolean
    halfThickness: number
}

export interface MiterCorner { left?: Point2D; right?: Point2D }
// junctionkey, wallId
export interface MiterData { junctionData: Map<string, Map<string, MiterCorner>> }

export const EMPTY_MITER_DATA: MiterData = { junctionData: new Map() }


function findJunctions(walls: WallNode[]): Map<string, Junction> {
    const buckets = new Map<string, Junction>()

    const push = (p: Point2D, wall: WallNode, endType: EndType) => {
        const key = quantizeKey(p, JUNCTION_TOLERANCE)
        let j = buckets.get(key)
        if (!j) { j = { meetingPoint: p, connected: [] }; buckets.set(key, j) }
        j.connected.push({wall, endType})
    }

    // 第一遍： 每堵墙的两个端点入桶
    for (const wall of walls) {
        push(wallStart(wall), wall, 'start')
        push(wallEnd(wall), wall, 'end')
    }

    // 第二遍： T 型 —— 交点落在某堵墙上
    for (const junction of buckets.values()) {
        for (const wall of walls) {
            if (junction.connected.some((c) => c.wall.id === wall.id)) continue
            if (pointOnSegment(junction.meetingPoint, wallStart(wall), wallEnd(wall), JUNCTION_TOLERANCE)) {
                junction.connected.push({ wall, endType: 'passthrough' })
            }
        }
    }

    const result = new Map<string, Junction>()
    for (const [key, j] of buckets) if (j.connected.length >= 2) result.set(key, j)
    return result
}


function legsAtJunction(
    wall: WallNode, endType: EndType, meetingPoint: Point2D, halfT: number,
): Leg[] {
    const forward = sub(wallEnd(wall), wallStart(wall))

    const dirs = 
      endType === 'passthrough' ? [forward, scale(forward, -1)]
      : endType === 'start' ? [forward] : [scale(forward, -1)]

    const legs: Leg[] = []
    for (const v of dirs) {
        if (len(v) < EPSILON) continue
        legs.push({
            wallId: wall.id,
            angle: Math.atan2(v.y, v.x),
            edgeLeft: lineFromPointAndDirection(add(meetingPoint, n), v),
            edgeRight: lineFromPointAndDirection(sub(meetingPoint, n), v),
            isPassthrough: endType === 'passthrough',
            halfThickness: halfT,
        })
    }
    return legs
}

export interface WallMiterBoundaryPoints {
    startLeft: Point2D; startRight: Point2D
    endLeft: Point2D; endRight: Point2D
}

export function getWallMiterBoundaryPoints(
    wall: WallNode, miter: MiterData,
): WallMiterBoundaryPoints | null {
    const start = wallStart(wall)
    const end = wallEnd(wall)
    const v = sub(end, start)
    if (len(v) < EPSILON) return null

    const n = scale(leftNormal(v), getWallThickness(wall) / 2)
    const cornerAt = (p: Point2D) =>
        miter.junctionData.get(quantizeKey(p, JUNCTION_TOLERANCE))?.get(wall.id)

    const s = cornerAt(start)
    const e = cornerAt(end)

    return {
        startLeft: s?.left ?? add(start, n),
        startRight: s?.right ?? sub(start, n),
        endLeft: e?.right ?? add(end, n),
        endRight: e?.left ?? sub(end, n),
    }
}


export function hasJunctionAt(wall: WallNode, p: Point2D, miter: MiterData): boolean {
    return miter.junctionData.get(quantizeKey(p, JUNCTION_TOLERANCE))?.has(wall.id) ?? false
}