import { useStore } from "zustand";
import type { SceneStorage } from "../../../core/persistence/scene-storage";
import { useEditor, type Tool } from "../../store/use-editor";
import { useScene } from "../../../core/store/use-scene";
import { toolsEnabled, type ViewMode } from "../../../core/services/view-pose";
import { checkpointNow, newScene } from "../../persistence/scene-session";
import { redoScene, undoScene } from "../../hooks/use-history-shortcuts";

const TOOLS: { tool: Tool; label: string; key: string }[] = [
  { tool: 'select', label: '选择', key: 'V' },
  { tool: 'wall', label: '墙', key: 'W' },
  { tool: 'slab', label: '楼板', key: 'F' },
  { tool: 'ceiling', label: '天花', key: 'G' },
  { tool: 'column', label: '柱', key: 'C' },
  { tool: 'door', label: '门', key: 'D' },
  { tool: 'window', label: '窗', key: 'N' },
]

const VIEWS: { mode: ViewMode; label: string; key: string }[] = [
  { mode: '3d', label: '3D', key: '1' },
  { mode: 'plan', label: '顶视', key: '2' },
  { mode: 'front', label: '前', key: '3' },
  { mode: 'back', label: '后', key: '4' },
  { mode: 'left', label: '左', key: '5' },
  { mode: 'right', label: '右', key: '6' },
]
export function Toolbar({ storage }: { storage: SceneStorage }) {
  const activeTool = useEditor((s) => s.activeTool)
  const viewMode = useEditor((s) => s.viewMode)

  // 撤销 / 重做 的可用性要订阅 temporal
  const canUndo = useStore(useScene.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useScene.temporal, (s) => s.futureStates.length > 0)

  const editing = toolsEnabled(viewMode)

  return (
    <div className="toolbar workbench_toolbar">
      <span className="toolbar_label">工具</span>
      <div className="toolbar_group">
        {TOOLS.map(({ tool, label, key }) => (
          <button
            key={tool}
            className={`btn${activeTool === tool && editing ? 'btn--on' : ''}`}
            // 立面里射线和地面平行，拿不到落点
            disabled={!editing}
            title={editing ? `${label} (${key})` : '立面视图里只能看，不能画'}
            onClick={() => useEditor.getState().setActiveTool(tool)}
          >
            {label}<span className="btn__key">{key}</span>
          </button>
        ))}
      </div>

      <div className="toolbar_sep" />

      <span className="toolbar_label">视图</span>
      <div className="toolbar_group">
        {VIEWS.map(({ mode, label, key }) => (
          <button
            key={mode}
            className={`btn${viewMode === mode ? 'btn--on' : ''}`}
            title={`${label} (${key})`}
            onClick={() => useEditor.getState().setViewMode(mode)}
          >
            {label}<span className="btn__key">{key}</span>
          </button>
        ))}
        <button
          className="btn"
          title="把整个场景框进画面（Home）"
          onClick={() => useEditor.getState().requestFit()}
        >
          适配<span className="btn__key">Home</span>
        </button>
      </div>

      <div className="toolbar__sep" />

      <div className="toolbar_group">
        <button className="btn" disabled={!canUndo} title="撤销（Ctrl+z）" onClick={undoScene}>⬅️</button>
        <button className="btn" disabled={!canRedo} title="重做（Ctrl+Shift+Z）" onClick={redoScene}>➡️</button>
        <button className="btn" onClick={() => newScene(storage, '未命名')}>新建</button>
        <button className="btn" onClick={() => checkpointNow(storage)}>存档点</button>
      </div>

    </div>
  )
}