import { resolveCurrentLevelId } from "../../../core/services/level-stack"
import { useScene } from "../../../core/store/use-scene"
import { useEditor } from "../../store/use-editor"
import { useInteractionScope } from "../../store/use-interaction-scope"
import { usePersistence } from "../../store/use-persistence"
import { statusHint } from "./status-hints"

const SAVE_LABEL: Record<string, string> = {
  idle: '未保存',
  pending: '未保存',
  saved: '已保存',
  error: '保存失败',
  disabled: '本次不会保存',
}

/**
 * 光标坐标的落点。app-2 的 ViewportReadout 每帧往这里写 textContent --
 * 它住在 Canvas 里（那边才拿到相机），
 */
export const CURSOR_READOUT_ID = 'status-cursor'

export function StatusBar() {
  const activeTool = useEditor((s) => s.activeTool)
  const viewMode = useEditor((s) => s.viewMode)
  const preferred = useEditor((s) => s.currentLevelId)
  const scope = useInteractionScope((s) => s.scope)

  const saveStatus = usePersistence((s) => s.saveStatus)
  const lastError = usePersistence((s) => s.lastError)

  const levelOrdinal = useScene((s) => {
    const id = resolveCurrentLevelId(preferred, s.nodes)
    const level = id === null ? undefined : s.nodes[id]
    return level?.type === 'level' ? level.level : null
  })

  return (
    <div className="statusbar workbench__status">
      <span className="statusbar__cell" id={CURSOR_READOUT_ID}>x = - Z = -</span>
      <span className="statusbar__sep">|</span>
      <span className="statusbar_cell">{levelOrdinal ?? '-'}</span>
      <span className="statusbar_sep">|</span>
      <span className="statusbar_cell">{viewMode}</span>
      <span className="statusbar_sep">|</span>
      <span className="statusbar_cell statusbar__cell--grow">{statusHint(scope, activeTool)}</span>
      <span className="statusbar_sep">|</span>
      <span className={`statusbar__cell${saveStatus === 'error' ? 'statusbar_error' : ''}`}>
        {SAVE_LABEL[saveStatus]}
      </span>
      {lastError !== null && <span className="statusbar__cell statusbar_error">{lastError}</span>}
    </div>
  )
}