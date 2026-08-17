import { pointOnSegment, quantizeKey, type Point2D } from "../../lib/geometry-2d"
import { wallEnd, wallStart, type WallNode } from "../../schema/wall"

const JUNCTION_TOLERANCE = 1e-3

const MITER_LIMIT = 10

type EndType = 'start' | 'end' | 'passthrough'

interface Junction {
    meetingPoint: Point2D
    connected: Array<{wall: WallNode; endType: EndType}>
}

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