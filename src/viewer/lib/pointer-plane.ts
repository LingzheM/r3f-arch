import * as THREE from 'three'
import type { Point2D } from '../../core/lib/geometry-2d'
const raycaster = new THREE.Raycaster()
const plane     = new THREE.Plane()
const UP        = new THREE.Vector3(0, 1, 0)
// 复用模块级 scratch 是安全的 —— 我们立刻读出 x/z 并返回一个新对象，
// 从不把 scratch 本身交给调用方。这正是可以复用的判据。
const scratch   = new THREE.Vector3()
const ndc = new THREE.Vector2()

/** 屏幕 NDC 点 → 地平面上的世界点。
 *  纯数学，不依赖任何实体 mesh，所以永不被遮挡，正交 / 透视都成立。 */
export function screenToGround(
  pointer: THREE.Vector2,   // NDC，[-1,1]。R3F 的 useThree().pointer 已经是这个
  camera: THREE.Camera,
  planeY = 0,
): Point2D | null {
  raycaster.setFromCamera(pointer, camera)
  // ⚠ Plane 第二个参数是「有符号距离常数」，不是高度。
  //   y = h 的平面 ⟹ constant = −h。写成 +h 时墙会画在镜像高度上。
  plane.set(UP, -planeY)
  const hit = raycaster.ray.intersectPlane(plane, scratch)
  if (!hit) return null                // 射线与平面平行（相机水平看）
  return { x: hit.x, y: hit.z }        // ← 世界 Z 落进 Point2D.y
}

export function eventToNdc(
  event: { clientX: number; clientY: number },
  element: HTMLElement,
  target: THREE.Vector2
): THREE.Vector2 {
  const rect = element.getBoundingClientRect()
  return target.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
}

export function eventToGround(
  event: { clientX: number; clientY: number },
  element: HTMLElement,
  camera: THREE.Camera,
  planeY = 0,
): Point2D | null {
  return screenToGround(eventToNdc(event, element, ndc), camera, planeY)
}