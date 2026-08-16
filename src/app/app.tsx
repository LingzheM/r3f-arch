import { OrbitControls } from "@react-three/drei";
import { Viewer } from "../viewer/components/viewer";
import { useEditor } from "./store/use-editor";
import { WallTool } from "./tools/wall-tool";

export function App() {
    const viewMode = useEditor((s) => s.viewMode)
    const activeTool = useEditor((s) => s.activeTool)

    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Viewer mode={viewMode}>
                <OrbitControls
                makeDefault
                enableRotate={viewMode === '3d' && activeTool !== 'wall'}
                />
                <WallTool />
            </Viewer>

            <div style={{
                position: 'absolute', left: 12, bottom: 12, padding: '6px 10px',
                font:'12px ui-monospace, monospace', background: 'rgba(255,255,255,.85)',
                borderRadius:3, pointerEvents: 'none',
            }}>
                {activeTool} {viewMode} &nbsp; |&nbsp; W 墙 V 选
            </div>
        </div>
    )
}