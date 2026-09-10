import * as THREE from 'three'
import type { Point2D } from '../../../core/lib/geometry-2d'

export function buildPrismGeometry(
  polygon: readonly Point2D[],
  bottomY: number,
  topY: number,
): THREE.BufferGeometry | null {
  const height = topY - bottomY
  if (polygon.length < 3 || height <= 0) return null

  const shape = new THREE.Shape()
  shape.moveTo(polygon[0]!.x, -polygon[0]!.y)
  for (let i = 1; i < polygon.length; i += 1) {
    shape.lineTo(polygon[i]!.x, -polygon[i]!.y)
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bottomY, 0)

  return geometry
}

export function buildPolygonPrism({
  polygon,
  bottomY,
  topY,
  color,
  name,
}: {
  polygon: readonly (readonly [number, number])[]
  bottomY: number
  topY: number
  color: string
  name: string
}): THREE.Object3D {
  const root = new THREE.Group()

  const geometry = buildPrismGeometry(
    polygon.map((p) => ({ x: p[0], y: p[1] })),
    bottomY,
    topY,
  )

  if (!geometry) return root

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true

  root.add(mesh)
  return root
}