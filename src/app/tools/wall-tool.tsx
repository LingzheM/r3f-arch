// src/app/tools/wall-tool.tsx
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Point2D } from '../../core/lib/geometry-2d'
import { useScene } from '../../core/store/use-scene'
import { screenToGround } from '../../viewer/lib/pointer-plane'
import { useEditor } from '../store/use-editor'

const ndc = new THREE.Vector2()

/** M1 版画墙工具：点两下。Esc 取消。
 *
 *  ⚠ 这段有保质期。下面那个 pendingRef 就是 interaction-scope.md 里列举的
 *  「7 个独立布尔标志」的第一个。M3 重构成 spine 的触发条件是
 *  "第二个工具出现"，不是"代码变丑" —— 当你加选择工具、发现
 *  "画墙画到一半时点击该不该选中物体"没有单一答案时，那一刻就是。 */
export function WallTool() {
  const activeTool = useEditor((s) => s.activeTool)
  const { gl, camera } = useThree()
  const pendingRef = useRef<Point2D | null>(null)

  useEffect(() => {
    if (activeTool !== 'wall') { pendingRef.current = null; return }
    const el = gl.domElement

    // 监听挂在 canvas DOM 上，不是 R3F 的 <group onPointerDown>：
    // R3F 事件依赖射线命中物体，而我们要「点空地也算」。
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      // 自己算 NDC：原生事件先于 R3F 的 state.pointer 更新，读它可能是上一帧的。
      const r = el.getBoundingClientRect()
      ndc.set(
        ((e.clientX - r.left) / r.width)  * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      )
      const p = screenToGround(ndc, camera)
      if (!p) return

      const start = pendingRef.current
      if (!start) { pendingRef.current = p; return }
      pendingRef.current = null
      // 预览墙**绝不**先 addNode 进 store —— 那是 M3 live-overrides 的活，
      // 提前做会污染撤销历史。
      useScene.getState().addNode({
        type:  'wall',
        start: [start.x, start.y],
        end:   [p.x, p.y],
      })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pendingRef.current = null
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeTool, gl, camera])

  return null
}