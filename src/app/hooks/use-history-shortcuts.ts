import { useEffect } from "react";
import { getScope } from "../store/use-interaction-scope";
import { useScene } from "../../core/store/use-scene";
import { useEditor } from "../store/use-editor";
import { runAsSingleSceneHistoryStep } from "../../core/store/history-control";

export function useHistoryShortcuts(): void {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTypingTarget(e.target)) return

            if (getScope().kind !== 'idle') return

            const mod = e.ctrlKey || e.metaKey
            const key = e.key.toLowerCase()

            if (mod && key === 'z' && !e.shiftKey) {
                e.preventDefault()
                undoScene()
                return
            }

            if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) {
                e.preventDefault()
                redoScene()
                return
            }

            if (key === 'delete' || key === 'backspace') {
                const id = useEditor.getState().selectId
                if (!id) return
                e.preventDefault()

                runAsSingleSceneHistoryStep(useScene, () => {
                    useScene.getState().removeNode(id)
                })
                useEditor.getState().select(null)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])
}

export function undoScene(): void {
    useScene.temporal.getState().undo()
    afterHistoryJump()
}

export function redoScene(): void {
    useScene.temporal.getState().redo()
    afterHistoryJump()
}

function afterHistoryJump(): void {
    useScene.getState().markAllDirty()

    const id = useEditor.getState().selectId
    if (id && !useScene.getState().nodes[id]) useEditor.getState().select(null)
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable) return true
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
}