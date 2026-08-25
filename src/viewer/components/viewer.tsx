import type { ReactNode } from "react";
import type { AnyNodeId } from "../../core/schema/types";
import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./camera-rig";
import { usePointerGesture } from "../hooks/use-pointer-gesture";
import { useGridEvents } from "../hooks/use-grid-events";
import { Ground } from "./ground";
import { SelectionContext } from "./scene-context";
import { SceneRenderer } from "./node-renderer";

export function Viewer({
    mode,
    selectId = null,
    children,
}: {
    mode: '3d' | 'plan',
    selectId?: AnyNodeId | null,
    children?: ReactNode
}) {
    return (
        <Canvas>
            <CameraRig mode={mode} />
            <ViewInput />

            <ambientLight />
            <directionalLight />

            <Ground />

            <SelectionContext.Provider value={selectId}>
                <SceneRenderer />
            </SelectionContext.Provider>
            {children}
        </Canvas>
    )
}

function ViewInput(): null {
    usePointerGesture()
    useGridEvents()
    return null
}