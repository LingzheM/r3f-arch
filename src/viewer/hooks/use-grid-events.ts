import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { isClickGesture } from '../lib/pointer-gesture'
import { sceneRegistry } from '../../core/registry/scene-registry'
import { screenToGround } from '../lib/pointer-plane'
import { emitter } from '../../core/events/bus'

const ndc = new THREE.Vector2()
const raycaster = new THREE.Raycaster()


export function useGridEvents(planeY = 0): void {
    const { gl, camera } = useThree()

    useEffect(() => {
        const el = gl.domElement

        const onPointerUp = (e: PointerEvent) => {
            if (e.button !== 0) return
            if (!isClickGesture(e)) return

            const r = el.getBoundingClientRect()
            ndc.set(
                ((e.clientX - r.left) / r.width) * 2 - 1,
                -((e.clientY - r.top) / r.height) * 2 + 1,
            )

            raycaster.setFromCamera(ndc, camera)
            const targets = Array.from(sceneRegistry.nodes.values())
            if (targets.length > 0 && raycaster.intersectObjects(targets, true).length > 0) return

            const p = screenToGround(ndc, camera)
            if (!p) return
            emitter.emit('grid:click', { point: [p.x, planeY, p.y], nativeEvent:e })
        }

        el.addEventListener('pointerup', onPointerUp)
        return () => el.removeEventListener('pointerup', onPointerUp)
    }, [gl, camera, planeY])
}