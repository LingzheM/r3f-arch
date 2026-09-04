import type * as THREE from 'three'
import { getCeilingHeight, getCeilingThickness, type CeilingNode } from '../../../core/schema/ceiling'
import type { GeometryContext, NodeAppearance } from '../../../core/registry/node-definition'
import { buildPolygonPrism } from '../shared/polygon-prism'

const CEILING_COLOR = '#e6e9e7'
const CEILING_SELECTED_COLOR = '#7dd3c0'

export function buildCeilingGeometry(
  node: CeilingNode,
  _ctx: GeometryContext,
  appearance: NodeAppearance,
): THREE.Object3D {
  const bottomY = getCeilingHeight(node)

  return buildPolygonPrism({
    polygon: node.polygon,
    bottomY,
    topY: bottomY + getCeilingThickness(node),
    color: appearance.selected ? CEILING_SELECTED_COLOR : CEILING_COLOR,
    name: 'ceiling-body',
  })
}