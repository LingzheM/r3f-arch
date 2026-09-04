import * as THREE from 'three'

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

  const height = topY - bottomY

  if (polygon.length < 3 || height <= 0) return root

  const shape = new THREE.Shape()
  shape.moveTo(polygon[0]![0], -polygon[0]![1])
  for (let i = 1; i < polygon.length; i += 1) {
    shape.lineTo(polygon[i]![0], -polygon[i]![1])
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bottomY, 0)

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true

  root.add(mesh)
  return root
}