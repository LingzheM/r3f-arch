import { useEffect } from "react";
import type { GridEvent, NodeEvent } from "../../core/events/types";
import { isSelectionEnabled } from "../store/use-interaction-scope";
import { useEditor } from "../store/use-editor";
import { emitter } from "../../core/events/bus";
import { selectableKinds } from "../../core/registry/node-registry";
import { nodeClickKeys } from "../lib/interaction/node-click-keys";

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

        const clickKeys = nodeClickKeys(selectableKinds())

        for (const key of clickKeys) emitter.on(key, onNodeClick)
        emitter.on('grid:click', onGridClick)


        return () => {
            for (const key of clickKeys) emitter.off(key, onNodeClick)
            emitter.off('grid:click', onGridClick)
        }
    }, [])


    return null
}