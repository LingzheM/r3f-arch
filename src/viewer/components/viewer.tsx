import { useMemo, useState, type ReactNode } from "react";
import type { AnyNodeId } from "../../core/schema/types";
import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./camera-rig";
import { usePointerGesture } from "../hooks/use-pointer-gesture";
import { useGridEvents } from "../hooks/use-grid-events";
import { Ground } from "./ground";
import { SelectionContext } from "./scene-context";
import { SceneRenderer } from "./node-renderer";
import { registerAllNodes } from "../nodes/register";
import { GeometrySystem } from "../systems/geometry-system";
import { viewPose, type ViewMode, type ViewPose } from "../../core/services/view-pose";

export function Viewer({
    mode,
    pose,
    fitToken = 0,
    selectId = null,
    children,
}: {
    mode: ViewMode,
    pose?: ViewPose,
    fitToken?: number,
    selectId?: AnyNodeId | null,
    children?: ReactNode
}) {
    const fallbackPose = useMemo(() => viewPose(mode, null), [mode])

    useState(() => {
        registerAllNodes()
        return null
    })

    return (
        <Canvas>
            <CameraRig mode={mode} pose={pose ?? fallbackPose} fitToken={fitToken} />
            <ViewInput />

            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />

            <Ground variant={mode === 'plan' ? 'plan' : '3d'} />

            <SelectionContext.Provider value={selectId}>
                <SceneRenderer />
                <GeometrySystem />
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