import { events } from "@react-three/fiber"
import { acquireSceneHistoryPause } from "../../../core/store/history-control"
import { useScene } from "../../../core/store/use-scene"
import { useViewer } from "../../../viewer/store/use-viewer"

export type DragSession = {
    end: (mode: 'commit' | 'cancel') => void 
}

type DragSessionHandlers = {
    onMove: (event: PointerEvent) => void
    onCommit: () => void
    onCancel: () => void
}

export function startDragSession({ onMove, onCommit, onCancel }: DragSessionHandlers): DragSession {
    useViewer.getState().setInputDragging(true)
    const releaseHistory = acquireSceneHistoryPause(useScene)

    let finished = false

    const finish = (mode: 'commit' | 'cancel') => {
        if (finished) return
        finished = true

        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleCancel)
        window.removeEventListener('keydown', handleKey)
        window.removeEventListener('blur', handleBlur)

        releaseHistory()
        useViewer.getState().setInputDragging(false)

        if (mode === 'commit') onCommit()
        else onCancel()
    }

    const handleMove = (event: PointerEvent) => onMove(event)
    const handleUp = (event: PointerEvent) => { if (event.button === 0) finish('commit') }
    const handleCancel = () => finish('cancel')
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') finish('cancel') }
    const handleBlur = () => finish('cancel')

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    window.addEventListener('keydown', handleKey)
    window.addEventListener('blur', handleBlur)

    return { end: finish }
}