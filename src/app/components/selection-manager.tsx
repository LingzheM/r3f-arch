import { useEffect } from "react";
import type { GridEvent, NodeEvent, NodeEventKey } from "../../core/events/types";
import { isSelectionEnabled } from "../store/use-interaction-scope";
import { useEditor } from "../store/use-editor";
import { emitter } from "../../core/events/bus";
import { nodeRegistry } from "../../core/registry/node-registry";

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

        const clickKeys = [...nodeRegistry.entries()].map(
            ([kind]) => `${kind}:click` as NodeEventKey,
        )

        for (const key of clickKeys) emitter.on(key, onNodeClick)
        emitter.on('grid:click', onGridClick)


        return () => {
            for (const key of clickKeys) emitter.off(key, onNodeClick)
            emitter.off('grid:click', onGridClick)
        }
    }, [])


    return null
}