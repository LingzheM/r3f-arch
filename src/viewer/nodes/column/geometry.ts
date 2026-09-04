import * as THREE from 'three'
import type { GeometryContext, NodeAppearance } from "../../../core/registry/node-definition"
import { getColumnDepth, getColumnHeight, getColumnRadius, getColumnWidth, type ColumnNode } from "../../../core/schema/column"

const COLUMN_COLOR = '#d9d3c8'
const COLUMN_SELECTED_COLOR = '#7dd3c0'
const RADIAL_SEGMENTS = 24


export function buildColumnGeometry(
  node: ColumnNode,
  _ctx: GeometryContext,
  appearance: NodeAppearance,
): THREE.Object3D {
  const root = new THREE.Group()
  const height = getColumnHeight(node)

  const geometry =
    node.crossSection === 'round'
      ? new THREE.CylinderGeometry(
        getColumnRadius(node), getColumnRadius(node), height, RADIAL_SEGMENTS,
      )
      : new THREE.BoxGeometry(getColumnWidth(node), height, getColumnDepth(node))

  geometry.translate(0, height / 2, 0)

  const material = new THREE.MeshStandardMaterial({
    color: appearance.selected ? COLUMN_SELECTED_COLOR : COLUMN_COLOR,
    roughness: 0.85,
    metalness: 0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'column-body'
  mesh.castShadow = true
  mesh.receiveShadow = true

  root.add(mesh)
  return root
}