import type { Point2D } from "../../lib/geometry-2d";
import type { AnyNode, AnyNodeId } from "../../schema/types";
import type { WallNode } from "../../schema/wall";
import { adjacentLevelId } from "../../services/level-stack";
import { getWallPlanFootprint } from "./wall-footprint";
import { calculateLevelMiters } from "./wall-mitering";

export function levelBelowFootprints(
  levelId: AnyNodeId | null,
  nodes: Record<AnyNodeId, AnyNode>,
): Point2D[][] {
  const belowId = adjacentLevelId(levelId, nodes, -1)
  if (belowId === null) return []

  const walls: WallNode[] = []
  for (const node of Object.values(nodes)) {
    if (node.type === 'wall' && node.parentId === belowId) walls.push(node)
  }
  if (walls.length === 0) return []

  const miter = calculateLevelMiters(walls)

  const footprints: Point2D[][] = []
  for (const wall of walls) {
    const plan = getWallPlanFootprint(wall, miter)
    if (plan.length >= 3) footprints.push(plan)
  }
  return footprints
}