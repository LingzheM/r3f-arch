import { useState, type ReactNode } from "react";
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

export function Viewer({
    mode,
    selectId = null,
    children,
}: {
    mode: '3d' | 'plan',
    selectId?: AnyNodeId | null,
    children?: ReactNode
}) {

    useState(() => {
        registerAllNodes()
        return null
    })

    return (
        <Canvas>
            <CameraRig mode={mode} />
            <ViewInput />

            <ambientLight />
            <directionalLight />

            <Ground />

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