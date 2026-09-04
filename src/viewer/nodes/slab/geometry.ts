import type * as THREE from 'three'
import { getSlabThickness, type SlabNode } from '../../../core/schema/slab'
import type { GeometryContext, NodeAppearance } from '../../../core/registry/node-definition'
import { buildPolygonPrism } from '../shared/polygon-prism'


const SLAB_COLOR = '#cfd6d2'
const SLAB_SELECTED_COLOR = '#7dd3c0'


export function buildSlabGeometry(
  node: SlabNode,
  _ctx: GeometryContext,
  appearance: NodeAppearance,
): THREE.Object3D {
  const thickness = getSlabThickness(node)

  return buildPolygonPrism({
    polygon: node.polygon,
    bottomY: node.elevation - thickness,
    topY: node.elevation,
    color: appearance.selected ? SLAB_SELECTED_COLOR : SLAB_COLOR,
    name: 'slab-body',
  })
}