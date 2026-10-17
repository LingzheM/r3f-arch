import { useState } from "react"
import type { SceneStorage } from "../../core/persistence/scene-storage"
import { usePersistence } from "../store/use-persistence"
import { deleteScene, openScene, restoreCheckpoint } from "../persistence/scene-session"

export function ScenePanel({ storage }: { storage: SceneStorage }) {
  const revision = usePersistence((s) => s.revision)
  const currentSceneId = usePersistence((s) => s.currentSceneId)
  const lastReport = usePersistence((s) => s.lastReport)
  const [editingId, setEditingId] = useState<string | null>(null)

  void revision
  const scenes = storage.list()
  const checkpoints = currentSceneId === null ? [] : storage.listCheckpoints(currentSceneId).slice(-10).reverse()

  const onDelete = (id: string, name: string) => {
    if (window.confirm(`[删除场景 ${name}] ？这会连同它的存档点一起删掉，撤不回来。`)) {
      deleteScene(storage, id)
    }
  }

  return (
    <section className="rail__section rail__section--scenes">
      <div className="rail__title">场景</div>
      <div className="rail__body">
        {scenes.map((meta) => (
          <div key={meta.id} className={`row${meta.id === currentSceneId ? 'row--on' : ''}`}>
            {editingId === meta.id ? (
              <input autoFocus defaultValue={meta.name} className="row__grow row__input" />
            ) : (
              <span className="row__grow" title={`${meta.nodeCount} 个节点 · ${meta.updatedAt}`} onDoubleClick={() => setEditingId(meta.id)}>
                {meta.name} <span className="row__dim">· {meta.nodeCount}</span>
              </span>
            )}
            <button className="btn" disabled={meta.id === currentSceneId} onClick={() => openScene(storage, meta.id)}>打开</button>
            <button className="btn" onClick={() => onDelete(meta.id, meta.name)}>删</button>
          </div>
        ))}

        {lastReport !== null && (
          <div className="rail__note">...原样...</div>
        )}

        {checkpoints.length > 0 && (
          <details>
            <summary>存档点（{checkpoints.length}）</summary>
            {checkpoints.map((cp) => (
              <div key={cp.id} className="row">
                <span className="row__grow" title={cp.createdAt}>{cp.label || cp.createdAt || cp.id}</span>
                <button className="btn" onClick={() => restoreCheckpoint(storage, cp.sceneId, cp.id)}>恢复</button>
              </div>
            ))}
          </details>
        )}
      </div>
    </section>
  )
}