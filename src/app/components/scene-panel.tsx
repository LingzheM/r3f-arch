import { useState } from "react"
import type { SceneStorage } from "../../core/persistence/scene-storage"
import { usePersistence } from "../store/use-persistence"
import { downloadText, pickTextFile } from "../persistence/file-io"
import { checkpointNow, deleteScene, exportCurrentScene, importSceneText, newScene, openScene, renameScene, restoreCheckpoint } from "../persistence/scene-session"

const panel: React.CSSProperties = {
  position: 'absolute', right: 12, top: 12, width: 280, maxHeight: 'calc(100vh - 24px)',
  overflow: 'auto',
  padding: 10, borderRadius: 4,
  font: '12px ui-monospace, monospace', background: 'rbga(255,255,255,.92)',
  boxShadow: '0 1px 6px rgba(0,0,0,.2)',
}

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }
const grow: React.CSSProperties = { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export function ScenePanel({ storage }: { storage: SceneStorage }) {
  const revision = usePersistence((s) => s.revision)
  const currentSceneId = usePersistence((s) => s.currentSceneId)
  const lastReport = usePersistence((s) => s.lastReport)
  const [editingId, setEditingId] = useState<string | null>(null)

  void revision
  const scenes = storage.list()
  const checkpoints = currentSceneId === null ? [] : storage.listCheckpoints(currentSceneId).slice(-10).reverse()

  const onImport = () => {
    void pickTextFile('.json').then((picked) => {
      if (picked === null) return
      importSceneText(storage, picked.text, picked.name.replace(/\.(r3f-scene\.)?json$/i, ''))
    })
  }

  const onExport = () => {
    const out = exportCurrentScene(storage)
    if (out !== null) downloadText(out.filename, out.text)
  }

  const onDelete = (id: string, name: string) => {
    if (window.confirm(`[删除场景 ${name}] ？这会连同它的存档点一起删掉，撤不回来。`)) {
      deleteScene(storage, id)
    }
  }

  return (
    <div style={panel}>
      <div style={{ ...row, fontWeight: 'bold' }}>场景
      </div>

      {scenes.map((meta) => (
        <div key={meta.id} style={{ ...row, background: meta.id === currentSceneId ? 'rgba(0,120,255,.12)' : undefined }}>
          {editingId === meta.id ? (
            <input
              autoFocus
              defaultValue={meta.name}
              style={{ ...grow, font: 'inherit' }}
              onBlur={(e) => { renameScene(storage, meta.id, e.target.value.trim() || meta.name); setEditingId(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingId(null)
              }}
            />
          )
            : (
              <span style={grow} title={`${meta.nodeCount} 个节点 · ${meta.updatedAt}`} onDoubleClick={() => setEditingId(meta.id)}>
                {meta.name} <span style={{ opacity: .5 }}>· {meta.nodeCount}</span>
              </span>
            )}
          <button disabled={meta.id === currentSceneId} onClick={() => openScene(storage, meta.id)}>打开</button>
          <button onClick={() => onDelete(meta.id, meta.name)}>删</button>
        </div>
      ))}
      <div style={{ ...row, marginTop: 6 }}>
        <button onClick={() => newScene(storage, '未命名')}>新建</button>
        <button onClick={onImport}>导入</button>
        <button onClick={onExport}>导出</button>
        <button onClick={() => checkpointNow(storage)}>存档点</button>
      </div>

      {lastReport !== null && (
        <div style={{ ...row, opacity: .7 }}>
          读档：从 v{lastReport.fromVersion} 迁过来
          {lastReport.report.dropped.length > 0 && ` · 丢了 ${lastReport.report.dropped.length} 个`}
          {lastReport.report.repairedParents.length > 0 && ` · 修了 ${lastReport.report.repairedParents.length} 个父`}
        </div>
      )}

      {checkpoints.length > 0 && (
        <>
          <div style={{ ...row, marginTop: 6, fontWeight: 'bold' }}>存档点</div>
          {checkpoints.map((cp) => (
            <div key={cp.id} style={row}>
              <span style={grow} title={cp.createdAt}>{cp.label || cp.createdAt || cp.id}</span>
              <button onClick={() => restoreCheckpoint(storage, cp.sceneId, cp.id)}>恢复</button>
            </div>
          ))}
        </>
      )}
    </div >
  )
}