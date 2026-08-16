import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import type * as THREE from 'three'

export function CameraRig({ mode }: { mode: '3d' | 'plan' }) {
    
    const planRef = useRef<THREE.OrthographicCamera>(null)

    useLayoutEffect(() => {
        const cam = planRef.current
        if (mode !== 'plan' || !cam) return
        cam.up.set(0, 0, -1)
        cam.lookAt(0, 0, 0)
        cam.updateProjectionMatrix()
    }, [mode])
    
    return mode === '3d' ? (
        <PerspectiveCamera makeDefault fov={50} near={0.1} far={1000} position={[10, 10, 10]} />
    ) : (
        <OrthographicCamera makeDefault zoom={40} near={-1000} far={1000} position={[0, 40, 0]} />
    )
}