import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { CameraRig } from "./camera-rig";
import { SceneRenderer } from "./node-renderer";
import { Ground } from "./ground";


export function Viewer({ mode, children }: { mode: '3d' | 'plan'; children?: ReactNode }) {
    return(
        <Canvas dpr={[1, 1.5]} shadows style={{ background: '#fafafa' }}>
            <CameraRig mode={mode} />

            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />

            <Ground />
            <SceneRenderer />

            {children}
        </Canvas>
    )
}