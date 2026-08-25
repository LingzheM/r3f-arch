import { quantizeKey, type Point2D } from "../../../core/lib/geometry-2d";
import type { AnyNodeId } from "../../../core/schema/types";
import { wallEnd, WallNode, wallStart } from "../../../core/schema/wall";
import type { NodeOverride } from "../../../core/store/use-live-overrides";
import { useScene } from "../../../core/store/use-scene";
import { JUNCTION_TOLERANCE } from "../../../core/systems/wall/wall-mitering";

export type OverrideEntry = readonly [AnyNodeId, NodeOverride]

export type PointMove = { from: Point2D; to: Point2D }

export function documentWalls(): WallNode[] {
    return Object.values(useScene.getState().nodes).filter(
        (n): n is WallNode => n.type === 'wall',
    )
}

export function linkedWallOverrides(
    walls: readonly WallNode[],
    moves: readonly PointMove[],
    excludeIds: ReadonlySet<AnyNodeId>,
): OverrideEntry[] {
    const targetByKey = new Map<string, Point2D>()
    for (const move of moves) {
        targetByKey.set(quantizeKey(move.from, JUNCTION_TOLERANCE), move.to)
    }

    const entries: OverrideEntry[] = []

    for (const wall of walls) {
        if (excludeIds.has(wall.id)) continue

        const nextStart = targetByKey.get(quantizeKey(wallStart(wall), JUNCTION_TOLERANCE))
        const nextEnd = targetByKey.get(quantizeKey(wallEnd(wall), JUNCTION_TOLERANCE))
        if (!nextStart && !nextEnd) continue

        const patch: NodeOverride = {}
        if (nextStart) patch.start = [nextStart.x, nextStart.y]
        if (nextEnd) patch.end = [nextEnd.x, nextEnd.y]
        entries.push([wall.id, patch])
    }

    return entries
}
