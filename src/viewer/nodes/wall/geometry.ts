import * as THREE from 'three'
import { midpoint, type Point2D } from '../../../core/lib/geometry-2d'
import type {
    GeometryContext,
    NodeAppearance,
    NodeFrame,
} from '../../../core/registry/node-definition'
import { getWallHeight, type WallNode } from '../../../core/schema/wall'
import { calculateLevelMiters, type MiterData } from '../../../core/systems/wall/wall-mitering'
import { getWallPlanFootprint } from '../../../core/systems/wall/wall-footprint'
import { openingSpan, type OpeningSpan } from '../../../core/schema/opening'
import { asNodeId } from '../../../core/schema/types'
import { splitWallByOpenings } from '../../../core/systems/wall/wall-openings'
import { buildPrismGeometry } from '../shared/polygon-prism'

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

export function wallTransform(wall: WallNode): NodeFrame {
    const start = toPoint(wall.start)
    const end = toPoint(wall.end)
    const rotationY = Math.atan2(-(end.y - start.y), end.x - start.x)
    return { position: [start.x, 0, start.y], rotationY }
}

export function wallCenter(wall: WallNode): Point2D {
    return midpoint(toPoint(wall.start), toPoint(wall.end))
}

export function computeWallLevelMiters(walls: readonly WallNode[]): MiterData {
    return calculateLevelMiters([...walls])
}

function collectOpeningSpans(node: WallNode, ctx: GeometryContext<MiterData>): OpeningSpan[] {
    const spans: OpeningSpan[] = []

    for (const childId of node.children) {
        const child = ctx.resolve(asNodeId(childId))
        if (!child) continue
        if (child.type !== 'door' && child.type !== 'window') continue
        spans.push(openingSpan(child))
    }

    return spans
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

    const bands = splitWallByOpenings(local, getWallHeight(node), collectOpeningSpans(node, ctx))
    if (bands.length === 0) return root

    const material = new THREE.MeshStandardMaterial({
        color: appearance.selected ? WALL_SELECTED_COLOR : WALL_COLOR,
        roughness: 0.9,
        metalness: 0,
    })

    for (const band of bands) {
        const geometry = buildPrismGeometry(band.polygon, band.bottomY, band.topY)
        if (!geometry) continue

        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = 'wall-body'
        mesh.castShadow = true
        mesh.receiveShadow = true
        root.add(mesh)
    }

    return root
}