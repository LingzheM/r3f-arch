import * as THREE from 'three'
import { len, midpoint, sub, wallFootprint, type Point2D } from '../../core/lib/geometry-2d'
import { getWallHeight, getWallThickness, type WallNode } from '../../core/schema/wall'
import type { MiterData } from '../../core/systems/wall/wall-mitering'
import { getWallPlanFootprint } from '../../core/systems/wall/wall-footprint'

const toPoint = (t: readonly [number, number]): Point2D => ({ x: t[0], y: t[1] })

export function worldToLocalXZ(
    p: Point2D, position: [number, number, number], rotationY: number,
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

    return { position: [c.x, 0, c.y], rotationY }
}


export function buildWallGeometry(wall: WallNode, miter: MiterData): THREE.BufferGeometry {
    const worldFp = getWallPlanFootprint(wall, miter)
    if (worldFp.length < 3) return new THREE.BufferGeometry()

    const { position, rotationY } = wallTransform(wall)
    const local = worldFp.map((p) => worldToLocalXZ(p, position, rotationY))

    const shape = new THREE.Shape()
    shape.moveTo(local[0]!.x, -local[0]!.y)
    for (let i = 1; i < local.length; i++) shape.lineTo(local[i]!.x, -local[i]!.y)
    shape.closePath()

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: getWallHeight(wall),
        bevelEnabled: false,
    })

    geometry.rotateX(-Math.PI / 2)
    return geometry
}