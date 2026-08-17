import * as THREE from 'three'
import { len, midpoint, sub, wallFootprint, type Point2D } from '../../core/lib/geometry-2d'
import { getWallHeight, getWallThickness, type WallNode } from '../../core/schema/wall'
import { buildPrismByHand } from './prism-by-hand'

const toPoint = (t: readonly [number, number]): Point2D => ({ x: t[0], y: t[1] })

export function buildWallGeometry(wall: WallNode): THREE.BufferGeometry {
    const length = len(sub(toPoint(wall.end), toPoint(wall.start)))

    //return new THREE.BoxGeometry(length, getWallHeight(wall), getWallThickness(wall))
    const start = toPoint(wall.start)
    const end = toPoint(wall.end)

    const worldFp = wallFootprint(start, end, getWallThickness(wall))
    if (worldFp.length === 0) return new THREE.BufferGeometry()

    const { position, rotationY } = wallTransform(wall)
    const localFp = worldFp.map((p) => worldToLocalXZ(p, position, rotationY))

    return buildPrismByHand(localFp, getWallHeight(wall))
}

export function worldToLocalXZ(
    p: Point2D,
    position: [number, number, number],
    rotationY: number,
): Point2D {
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    const dx = p.x - position[0]
    const dz = p.y - position[2]
    return { x: dx * cos - dz * sin, y: dx * sin + dz * cos }
}

export function wallTransform(wall: WallNode): {
    position: [number, number, number]
    rotationY: number
} {
    const start = toPoint(wall.start)
    const end = toPoint(wall.end)
    const c = midpoint(start, end)

    const rotationY = Math.atan2(-(end.y - start.y), end.x - start.x)

    return { position: [c.x, getWallHeight(wall) / 2, c.y], rotationY }
}