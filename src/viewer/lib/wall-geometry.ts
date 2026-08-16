import * as THREE from 'three'
import { len, midpoint, sub, type Point2D } from '../../core/lib/geometry-2d'
import { getWallHeight, getWallThickness, type WallNode } from '../../core/schema/wall'

const toPoint = (t: readonly [number, number]): Point2D => ({ x: t[0], y: t[1] })

export function buildWallGeometry(wall: WallNode): THREE.BufferGeometry {
    const length = len(sub(toPoint(wall.end), toPoint(wall.start)))

    return new THREE.BoxGeometry(length, getWallHeight(wall), getWallThickness(wall))
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