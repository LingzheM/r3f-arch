import * as THREE from 'three'
import { midpoint, type Point2D } from '../../../core/lib/geometry-2d'
import type { GeometryContext, NodeAppearance } from '../../../core/registry/node-definition'
import { getWallHeight, type WallNode } from '../../../core/schema/wall'
import { calculateLevelMiters, type MiterData } from '../../../core/systems/wall/wall-mitering'
import { getWallPlanFootprint } from '../../../core/systems/wall/wall-footprint'

const WALL_COLOR = '#e8e8e8'
const WALL_SELECTED_COLOR = '#7dd3c0'

const toPoint = (t: readonly [number, number]): Point2D => ({ x: t[0], y: t[1] })

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
    return { position: [c.x, 0, c.y], rotationY }
}

export function computeWallLevelMiters(walls: readonly WallNode[]): MiterData {
    return calculateLevelMiters([...walls])
}


export function buildWallGeometry(
    node: WallNode, 
    ctx: GeometryContext<MiterData>,
    appearance: NodeAppearance,
): THREE.Object3D {
    const root = new THREE.Group()

    const miter = ctx.levelData ?? calculateLevelMiters([node])
    const worldFootprint = getWallPlanFootprint(node, miter)
    if (worldFootprint.length < 3) return root

    const { position, rotationY } = wallTransform(node)
    const local = worldFootprint.map((p) => worldToLocalXZ(p, position, rotationY))

    const shape = new THREE.Shape()
    shape.moveTo(local[0]!.x, -local[0]!.y)
    for (let i = 1; i < local.length; i++) shape.lineTo(local[i]!.x, -local[i]!.y)
    shape.closePath()

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: getWallHeight(node),
        bevelEnabled: false,
    })
    geometry.rotateX(-Math.PI / 2)
    
    const material = new THREE.MeshStandardMaterial({
        color: appearance.selected ? WALL_SELECTED_COLOR : WALL_COLOR,
        roughness: 0.9,
        metalness: 0, 
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = 'wall-body'
    mesh.castShadow = true
    mesh.receiveShadow = true

    const body = new THREE.Group()
    body.position.set(position[0], position[1], position[2])
    body.rotation.y = rotationY
    body.add(mesh)

    root.add(body)
    return root
}