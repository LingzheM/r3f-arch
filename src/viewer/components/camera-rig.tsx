import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import * as THREE from 'three'
import type { ViewPose } from "../../core/services/view-pose";
import type { Vec3 } from "../../core/services/scene-bounds";
import { useThree } from "@react-three/fiber";
import { forgetPose, recallPose, rememberPose } from "../lib/camera-memory";

type OrbitLike = { target: THREE.Vector3; update: () => void }

const vec = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z]

export function CameraRig({
    mode,
    pose,
    fitToken,
}: {
    mode: '3d' | 'plan',
    pose: ViewPose,
    fitToken: number
}) {
    const perspectiveRef = useRef<THREE.PerspectiveCamera>(null)
    const orthoRef = useRef<THREE.OrthographicCamera>(null)

    const lastPerspective = useRef<THREE.PerspectiveCamera | null>(null)
    const lastFitToken = useRef(fitToken)

    const viewportHeight = useThree((s) => s.size.height)
    const controls = useThree((s) => s.controls) as OrbitLike | null

    useLayoutEffect(() => {
        const cam: THREE.PerspectiveCamera | THREE.OrthographicCamera | null =
            mode === '3d' ? perspectiveRef.current : orthoRef.current
        if (!cam) return
        if (mode === '3d' && perspectiveRef.current) lastPerspective.current = perspectiveRef.current

        // 点【适配】时 mode 没变化，靠 fitToken 变化识别。
        // 必须在 recallPose 之前作废: 上一轮的 cleanup 刚把【适配前】的视角记下来
        if (lastFitToken.current !== fitToken) {
            lastFitToken.current = fitToken
            forgetPose()
        }

        const applied = recallPose(mode) ?? { position: pose.position, target: pose.target }

        // up必须在 lookAt 之前：lookAt 用当下的up把朝向烘焙改成矩阵
        cam.up.set(...pose.up)
        cam.position.set(...applied.position)
        cam.lookAt(...applied.target)

        if (mode !== '3d' && orthoRef.current) {
            // viewer 只按视口【高】换算：zoom = 视口高 / (2 * 要框住的半高)
            orthoRef.current.zoom = viewportHeight / (2 * pose.orthoHalfHeight)
        }
        cam.updateProjectionMatrix()

        // OrbitControls 的 target 不跟着相机走。
        if (controls) {
            controls.target.set(...applied.target)
            controls.update()
        }

        return () => {
            // 离开 3D 的那一刻把用户转出来的视角记下来
            const prev = lastPerspective.current
            if (mode !== '3d' || !prev) return
            rememberPose('3d', {
                position: vec(prev.position),
                target: controls ? vec(controls.target) : applied.target,
            })
        }
    }, [mode, fitToken])

    return mode === '3d' ? (
        <PerspectiveCamera ref={perspectiveRef} makeDefault fov={50} near={0.1} far={1000} />
    ) : (
        <OrthographicCamera ref={orthoRef} makeDefault zoom={40} near={-1000} far={1000} />
    )
}