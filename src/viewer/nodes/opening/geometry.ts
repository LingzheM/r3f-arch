import * as THREE from 'three'
import type { GeometryContext, NodeAppearance } from "../../../core/registry/node-definition"
import { asNodeId } from "../../../core/schema/types"
import { getWallThickness, WallNode } from "../../../core/schema/wall"
import type { DoorNode } from '../../../core/schema/door'
import type { WindowNode } from '../../../core/schema/window'

const FRAME_WIDTH = 0.05
const FRAME_DEPTH_MARGIN = 0.01
const LEAF_DEPTH = 0.04

const DOOR_COLOR = '#b9906a'
const WINDOW_FRAME_COLOR = '#d8dcda'
const GLASS_COLOR = '#a8c8d8'
const SELECTED_COLOR = '#7dd3c0'


function hostThickness(parentId: string, ctx: GeometryContext): number {
  const host = ctx.resolve(asNodeId(parentId))
  if (!host || host.type !== 'wall') return getWallThickness({} as WallNode)
  return getWallThickness(host)
}

function addFrame(
  root: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  withBottom: boolean,
): void {
  const halfW = width / 2
  const halfH = height / 2
  const inner = FRAME_WIDTH

  const bar = (w: number, h: number, x: number, y: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), material)
    mesh.position.set(x, y, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    root.add(mesh)
  }

  bar(inner, height, -halfW + inner / 2, 0)
  bar(inner, height, halfW - inner / 2, 0)
  bar(width - inner * 2, inner, 0, halfH - inner / 2)
  if (withBottom) bar(width - inner * 2, inner, 0, -halfH + inner / 2)
}

export function buildDoorGeometry(
  node: DoorNode,
  ctx: GeometryContext,
  appearance: NodeAppearance,
): THREE.Object3D {
  const root = new THREE.Group()

  const thickness = hostThickness(node.parentId, ctx)
  const frameDepth = Math.max(thickness - FRAME_DEPTH_MARGIN, 0.01)

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: appearance.selected ? SELECTED_COLOR : DOOR_COLOR,
    roughness: 0.75,
    metalness: 0,
  })

  addFrame(root, node.width, node.height, frameDepth, frameMaterial, false)

  const leafWidth = node.width - FRAME_WIDTH * 2
  const leafHeight = node.height - FRAME_WIDTH
  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(leafWidth, leafHeight, LEAF_DEPTH),
    frameMaterial,
  )

  leaf.position.set(0, -FRAME_WIDTH / 2, 0)
  leaf.castShadow = true
  leaf.receiveShadow = true
  root.add(leaf)

  return root
}

export function buildWindowGeometry(
  node: WindowNode,
  ctx: GeometryContext,
  appearance: NodeAppearance,
): THREE.Object3D {
  const root = new THREE.Group()

  const thickness = hostThickness(node.parentId, ctx)
  const frameDepth = Math.max(thickness - FRAME_DEPTH_MARGIN, 0.01)

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: appearance.selected ? SELECTED_COLOR : WINDOW_FRAME_COLOR,
    roughness: 0.6,
    metalness: 0,
  })

  addFrame(root, node.width, node.height, frameDepth, frameMaterial, true)

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(
      node.width - FRAME_WIDTH * 2,
      node.height - FRAME_WIDTH * 2,
      0.01,
    ),
    new THREE.MeshStandardMaterial({
      color: GLASS_COLOR,
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: 0.35,
    }),
  )
  root.add(glass)

  return root
}