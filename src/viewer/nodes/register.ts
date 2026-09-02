import { nodeRegistry, registerNode } from "../../core/registry/node-registry"
import { wallDefinition } from "./wall/definition"

let registered = false

export function registerAllNodes(): void {
    if (registered) return
    registered = true
    registerNode(wallDefinition)
}

export { nodeRegistry }