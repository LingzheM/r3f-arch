import { useEffect } from "react";
import type { GridEvent, NodeEvent } from "../../core/events/types";
import { isSelectionEnabled } from "../store/use-interaction-scope";
import { useEditor } from "../store/use-editor";
import { emitter } from "../../core/events/bus";

export function SelectionManager(): null {
    useEffect(() => {
        const onNodeClick = (e: NodeEvent) => {
            if (!isSelectionEnabled()) return
            e.stopPropagation()
            useEditor.getState().select(e.node.id)
        }

        const onGridClick = (_e: GridEvent) => {
            if (!isSelectionEnabled()) return
            useEditor.getState().select(null)
        }

        emitter.on('wall:click', onNodeClick)
        emitter.on('grid:click', onGridClick)
        return () => {
            emitter.off('wall:click', onNodeClick)
            emitter.off('grid:click', onGridClick)
        }
    }, [])


    return null
}