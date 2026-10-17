import { OrbitControls } from "@react-three/drei";
import { Viewer } from "../viewer/components/viewer";
import { useEditor, type ViewMode } from "./store/use-editor";
import { WallTool } from "./tools/wall-tool";
import { useEffect, useMemo } from "react";
import { MOUSE } from "three";
import { useViewer } from "../viewer/store/use-viewer";
import { SelectionManager } from "./components/selection-manager";
import { useHistoryShortcuts } from "./hooks/use-history-shortcuts";
import { MoveTool } from "./tools/move-tool";
import { EndpointHandles } from "./tools/endpoint-handles";
import { PolygonTool } from "./tools/polygon-tool";
import { ColumnTool } from "./tools/column-tool";
import { OpeningTool } from "./tools/opening-tool";
import { useScene } from "../core/store/use-scene";
import { resolveCurrentLevelId } from "../core/services/level-stack";
import { addLevelOnTop, switchLevel } from "./lib/level/level-actions";
import { LevelFrame } from "./components/level-frame";
import { LevelVisibility } from "./components/level-visibility";
import type { SceneStorage } from "../core/persistence/scene-storage";
import { usePersistence } from "./store/use-persistence";
import { checkpointNow } from "./persistence/scene-session";
import { ScenePanel } from "./components/scene-panel";
import { computeSceneBounds } from "../core/services/scene-bounds";
import { toolsEnabled, viewPose } from "../core/services/view-pose";
import { Toolbar } from "./lib/ui/toolbar";
import { LevelPanel } from "./lib/ui/level-panel";
import { StatusBar } from "./lib/ui/status-bar";

const PLAN_MOUSE_BUTTONS = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }

/** 数字键 1–6 对应六种视图，顺序和工具条上一致 */
const VIEW_KEYS: Record<string, ViewMode> = {
    '1': '3d', '2': 'plan', '3': 'front', '4': 'back', '5': 'left', '6': 'right',
}

const TOOL_KEYS: Record<string, 'select' | 'wall' | 'slab' | 'ceiling' | 'column' | 'door' | 'window'> = {
    v: 'select', w: 'wall', f: 'slab', g: 'ceiling', c: 'column', d: 'door', n: 'window',
}

export function App({ storage }: { storage: SceneStorage }) {
    const viewMode = useEditor((s) => s.viewMode)
    const selectId = useEditor((s) => s.selectId)
    const fitToken = useEditor((s) => s.fitToken)

    const nodes = useScene((s) => s.nodes)
    const inputDragging = useViewer((s) => s.inputDragging)

    useHistoryShortcuts()

    const bounds = computeSceneBounds(nodes)
    const pose = useMemo(() => viewPose(viewMode, bounds), [viewMode, bounds])

    const editing = toolsEnabled(viewMode)


    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                checkpointNow(storage)
                return
            }
            if (e.ctrlKey || e.metaKey) return

            if (e.key === 'Tab') {
                e.preventDefault()
                useEditor.getState().toggleViewMode()
                return
            }
            if (e.key === 'Home') {
                useEditor.getState().requestFit()
                return
            }

            const view = VIEW_KEYS[e.key]
            if (view !== undefined) {
                useEditor.getState().setViewMode(view)
                return
            }

            if (!toolsEnabled(useEditor.getState().viewMode)) return

            const tool = TOOL_KEYS[e.key.toLowerCase()]
            if (tool !== undefined) {
                useEditor.getState().setActiveTool(tool)
                return
            }
            if (e.key === '[') switchLevel(-1)
            if (e.key === ']') switchLevel(1)
            if (e.key.toLowerCase() === 'l') addLevelOnTop()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [storage])


    return (
        <div className="workbench">
            <Toolbar storage={storage} />

            <div className="workbench__canvas">
                <Viewer mode={viewMode} pose={pose} fitToken={fitToken} selectId={selectId}>
                    <OrbitControls
                        makeDefault
                        enabled={!inputDragging}
                        enableRotate={viewMode === '3d'}
                        mouseButtons={viewMode === '3d' ? undefined : PLAN_MOUSE_BUTTONS}
                        onStart={() => useViewer.getState().setCameraDragging(true)}
                        onEnd={() => useViewer.getState().setCameraDragging(false)}
                    />
                    <SelectionManager />
                    <LevelVisibility />

                    {editing && (
                        <>
                            <LevelFrame>
                                <WallTool />
                                <PolygonTool tool="slab" />
                                <PolygonTool tool="ceiling" />
                                <ColumnTool />
                            </LevelFrame>
                            <OpeningTool kind="door" />
                            <OpeningTool kind="window" />
                            <MoveTool />
                            <EndpointHandles />
                        </>
                    )}
                </Viewer>
            </div>

            <div className="rail workbench__rail">
                <LevelPanel />
                <ScenePanel storage={storage} />
            </div>

            <StatusBar />
        </div>
    )
}