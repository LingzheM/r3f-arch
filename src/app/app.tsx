import { OrbitControls } from "@react-three/drei";
import { Viewer } from "../viewer/components/viewer";
import { useEditor } from "./store/use-editor";
import { WallTool } from "./tools/wall-tool";
import { useEffect } from "react";
import { MOUSE } from "three";
import { useViewer } from "../viewer/store/use-viewer";
import { SelectionManager } from "./components/selection-manager";
import { useHistoryShortcuts } from "./hooks/use-history-shortcuts";
import { MoveTool } from "./tools/move-tool";
import { EndpointHandles } from "./tools/endpoint-handles";
import { PolygonTool } from "./tools/polygon-tool";
import { ColumnTool } from "./tools/column-tool";

const PLAN_MOUSE_BUTTONS = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }

export function App() {
    const viewMode = useEditor((s) => s.viewMode)
    const activeTool = useEditor((s) => s.activeTool)
    const selectId = useEditor((s) => s.selectId)

    const inputDragging = useViewer((s) => s.inputDragging)

    useHistoryShortcuts()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault()
                useEditor.getState().toggleViewMode()
            }
            if (e.key.toLowerCase() === 'w') useEditor.getState().setActiveTool('wall')
            if (e.key.toLowerCase() === 'v') useEditor.getState().setActiveTool('select')
            if (e.key.toLowerCase() === 'f') useEditor.getState().setActiveTool('slab')
            if (e.key.toLowerCase() === 'g') useEditor.getState().setActiveTool('ceiling')
            if (e.key.toLowerCase() === 'c') useEditor.getState().setActiveTool('column')
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])


    const isPlan = viewMode === 'plan'

    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Viewer mode={viewMode} selectId={selectId}>
                <OrbitControls
                    makeDefault
                    enabled={!inputDragging}
                    enableRotate={!isPlan}
                    mouseButtons={isPlan ? PLAN_MOUSE_BUTTONS : undefined}
                    onStart={() => useViewer.getState().setCameraDragging(true)}
                    onEnd={() => useViewer.getState().setCameraDragging(false)}
                />
                <SelectionManager />
                <WallTool />
                <PolygonTool tool="slab" />
                <PolygonTool tool="ceiling" />
                <ColumnTool />
                <MoveTool />
                <EndpointHandles />
            </Viewer>

            <div style={{
                position: 'absolute', left: 12, bottom: 12, padding: '6px 10px',
                font: '12px ui-monospace, monospace', background: 'rgba(255,255,255,.85)',
                borderRadius: 3, pointerEvents: 'none',
            }}>
                {activeTool} · {viewMode} · sel={selectId ?? '—'}
                &nbsp;|&nbsp; W 墙 · F 楼板 · G 天花 · C 柱（Shift=方） · V 选 · Tab 视图
                &nbsp;|&nbsp; 多边形：点回起点 或 Enter 闭合 · Esc 取消
                &nbsp;|&nbsp; 拖墙移动 · 拖端点球 · Del 删 · Ctrl+Z 撤销
            </div>
        </div>
    )
}