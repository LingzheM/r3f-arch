import { len, sub } from "../../../core/lib/geometry-2d"
import { clampOpeningToWall, openingSpan, type OpeningSpan, type OpeningSide } from "../../../core/schema/opening"
import { snapToGrid } from "../../../core/schema/snap-2d"
import type { AnyNode, AnyNodeId } from "../../../core/schema/types"
import { getWallHeight, wallEnd, WallNode, wallStart } from "../../../core/schema/wall"

export type WallHit = {
  wallId: AnyNodeId
  u: number
  side: OpeningSide
}

export type OpeningPlacementResult = {
  position: [number, number, number]
  valid: boolean
}

export const wallLength = (wall: WallNode): number =>
  len(sub(wallEnd(wall), wallStart(wall)))

export function sideFromNormal(normal: readonly [number, number, number] | undefined): OpeningSide {
  return (normal?.[2] ?? 1) >= 0 ? 'left' : 'right'
}

export function overlapsExistingOpening(
  span: OpeningSpan,
  siblings: readonly AnyNode[],
  selfId?: AnyNodeId,
): boolean {
  for (const sibling of siblings) {
    if (sibling.id === selfId) continue
    if (sibling.type !== 'door' && sibling.type !== 'window') continue

    const other = openingSpan(sibling)
    if (span.right > other.left && other.right > span.left) return true
  }
  return false
}

export function resolveOpeningPlacement(args: {
  hit: WallHit,
  wall: WallNode,
  size: { width: number; height: number }
  sill: number
  siblings: readonly AnyNode[]
  selfId?: AnyNodeId
}): OpeningPlacementResult {
  const { hit, wall, size, sill, siblings, selfId } = args

  const snappedU = snapToGrid({ x: hit.u, y: 0 }).x
  const centerV = sill + size.height / 2

  const clamped = clampOpeningToWall([snappedU, centerV, 0], size, {
    length: wallLength(wall),
    height: getWallHeight(wall),
  })

  if (!clamped) {
    return { position: [wallLength(wall) / 2, centerV, 0], valid: false }
  }

  const span = openingSpan({ position: clamped, width: size.width, height: size.height })
  const valid = !overlapsExistingOpening(span, siblings, selfId)

  return { position: clamped, valid }
}

export function slideOpeningAlongWall(args: {
  u: number
  wall: WallNode
  opening: { position: readonly [number, number, number]; width: number; height: number }
  siblings: readonly AnyNode[]
  selfId: AnyNodeId
}): OpeningPlacementResult {
  const { u, wall, opening, siblings, selfId } = args

  const snappedU = snapToGrid({ x: u, y: 0 }).x
  const clamped = clampOpeningToWall(
    [snappedU, opening.position[1], opening.position[2]],
    opening,
    { length: wallLength(wall), height: getWallHeight(wall) },
  )

  if (!clamped) return { position: [...opening.position] as [number, number, number], valid: false }

  const span = openingSpan({ position: clamped, width: opening.width, height: opening.height })
  return { position: clamped, valid: !overlapsExistingOpening(span, siblings, selfId) }
}