import { nodeRegistry, registerNode } from "../../core/registry/node-registry"
import { ceilingDefinition } from "./ceiling/definition"
import { columnDefinition } from "./column/definition"
import { doorDefinition, windowDefinition } from "./opening/definition"
import { slabDefinition } from "./slab/definition"
import { wallDefinition } from "./wall/definition"

let registered = false

export function registerAllNodes(): void {
    if (registered) return
    registered = true
    registerNode(wallDefinition)
    registerNode(slabDefinition)
    registerNode(ceilingDefinition)
    registerNode(columnDefinition)
    registerNode(doorDefinition)
    registerNode(windowDefinition)
}

export { nodeRegistry }