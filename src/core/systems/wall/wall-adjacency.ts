import { pointOnSegment, quantizeKey } from "../../lib/geometry-2d";
import type { AnyNodeId } from "../../schema/types";
import { wallEnd, wallStart, type WallNode } from "../../schema/wall";
import { JUNCTION_TOLERANCE } from "./wall-mitering";

export function getAdjacentWallIds(
    walls: readonly WallNode[],
    dirtyWallIds: ReadonlySet<AnyNodeId>,
): Set<AnyNodeId> {
    const adjacent = new Set<AnyNodeId>
    if (dirtyWallIds.size === 0) return adjacent

    const byId = new Map(walls.map((w) => [w.id, w] as const))

    for (const dirtyId of dirtyWallIds) {
        const dirty = byId.get(dirtyId)
        if (!dirty) continue

        const dirtyStart = wallStart(dirty)
        const dirtyEnd = wallEnd(dirty)
        const dirtyStartKey = quantizeKey(dirtyStart, JUNCTION_TOLERANCE)
        const dirtyEndKey = quantizeKey(dirtyEnd, JUNCTION_TOLERANCE)

        for (const wall of walls) {
            if (wall.id === dirtyId) continue
            if (dirtyWallIds.has(wall.id)) continue
            if (adjacent.has(wall.id)) continue

            const start = wallStart(wall)
            const end = wallEnd(wall)

            const startKey = quantizeKey(start, JUNCTION_TOLERANCE)
            const endKey = quantizeKey(end, JUNCTION_TOLERANCE)
            if (
                startKey === dirtyEndKey ||
                startKey === dirtyEndKey ||
                endKey === dirtyStartKey ||
                endKey === dirtyEndKey
            ) {
                adjacent.add(wall.id)
                continue
            }

            if (pointOnSegment(dirtyStart, start, end, JUNCTION_TOLERANCE) ||
                pointOnSegment(dirtyEnd, start, end, JUNCTION_TOLERANCE)
            ) {
                adjacent.add(wall.id)
                continue
            }

            if (
                pointOnSegment(start, dirtyStart, dirtyEnd, JUNCTION_TOLERANCE) ||
                pointOnSegment(end, dirtyStart, dirtyEnd, JUNCTION_TOLERANCE)
            ) {
                adjacent.add(wall.id)
            }
        }
    }

    return adjacent
}


export function getWallRebuildSet(
    walls: readonly WallNode[],
    dirtyWallIds: ReadonlySet<AnyNodeId>,
): Set<AnyNodeId> {
    const all = getAdjacentWallIds(walls, dirtyWallIds)
    for (const id of dirtyWallIds) all.add(id)
    return all
}

export function wallEndsAt(
    wall: WallNode,
    keys: ReadonlySet<string>,
): { start: boolean; end: boolean } {
    return {
        start: keys.has(quantizeKey(wallStart(wall), JUNCTION_TOLERANCE)),
        end: keys.has(quantizeKey(wallEnd(wall), JUNCTION_TOLERANCE)),
    }
}