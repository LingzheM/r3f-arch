import type * as THREE from 'three'
import { getSlabThickness, type SlabNode } from '../../../core/schema/slab'
import type { GeometryContext, NodeAppearance } from '../../../core/registry/node-definition'
import { buildPolygonPrism } from '../shared/polygon-prism'


const SLAB_COLOR = '#cfd6d2'


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
    color: SLAB_COLOR,
    name: 'slab-body',
    selected: appearance.selected,
  })
}