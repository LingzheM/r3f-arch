import { getStoredLevelHeight, LevelNode } from "../../../core/schema/level";
import { asNodeId } from "../../../core/schema/types";
import { resolveCurrentLevelId } from "../../../core/services/level-stack";
import { useScene } from "../../../core/store/use-scene";
import { useEditor } from "../../store/use-editor";
import { addLevelOnTop } from "../level/level-actions";
import { commitLevelHeight } from "./commit-level-height";

export function LevelPanel() {
  const preferred = useEditor((s) => s.currentLevelId)

  const nodes = useScene((s) => s.nodes)
  const currentId = resolveCurrentLevelId(preferred, nodes)
  const current = currentId === null ? undefined : nodes[currentId]
  const buildingId = current?.type === 'level' ? current.parentId : null

  // 从高到低列 —— 和楼一样，顶层在上面
  const levels = Object.values(nodes)
    .filter((n): n is LevelNode => n.type === 'level' && n.parentId === buildingId)
    .sort((a, b) => b.level - a.level)

  return (
    <section className="rail__section rail_section--levels">
      <div className="rail__title">楼层</div>
      <div className="rail_body">
        {levels.map((level) => (
          <div
            key={level.id}
            className={`row${level.id === currentId ? ' row--on' : ''}`}
            onClick={() => useEditor.getState().setCurrentLevel(asNodeId(level.id))}
          >
            <span className="row__grow">{level.id === currentId ? '▸ ' : ' '}</span>
            <input
              className="row__input"
              type="number"
              step="0.1"
              min="0.1"
              defaultValue={getStoredLevelHeight(level)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
              /**
               * onBlur 而不是 onChange: 层高只有终值有意义。
               * 绑 onChange 的话，把 2.5 改成 3.0 的过程中[2.] [2] 都会写进store，
               */
              onBlur={(e) => {
                const height = commitLevelHeight(e.target.value)
                if (height === null) {
                  e.target.value = String(getStoredLevelHeight(level))
                  return
                }
                useScene.getState().updateNode(asNodeId(level.id), { height })
              }}
            />
            <span className="row_dim">m</span>
          </div>
        ))}

        <div className="rail_actions">
          <button className="btn" onClick={() => addLevelOnTop()}>+ 顶上加层</button>
        </div>
      </div>
    </section>
  )
}