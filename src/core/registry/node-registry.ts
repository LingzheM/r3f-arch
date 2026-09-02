import type { AnyNode, AnyNodeType } from "../schema/types";
import { asAnyDefinition, type AnyNodeDefinition, type NodeDefinition } from "./node-definition";

const definitions = new Map<AnyNodeType, AnyNodeDefinition>()

export function registerNode<N extends AnyNode, L>(def: NodeDefinition<N, L>): void {
    if (definitions.has(def.kind)) {
        throw new Error(`[registry] "${def.kind}"`)
    }
    definitions.set(def.kind, asAnyDefinition(def))
}

export const nodeRegistry = {
    get(kind: AnyNodeType): AnyNodeDefinition | undefined {
        return definitions.get(kind)
    },
    has(kind: AnyNodeType): boolean {
        return definitions.has(kind)
    },
    entries(): IterableIterator<[AnyNodeType, AnyNodeDefinition]> {
        return definitions.entries()
    },
    get size(): number {
        return definitions.size
    },
}

export function resetNodeRegistry(): void {
    definitions.clear()
}