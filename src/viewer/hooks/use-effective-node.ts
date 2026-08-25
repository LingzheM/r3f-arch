import { useMemo } from "react"
import { useLiveOverrides } from "../../core/store/use-live-overrides"
import type { AnyNode } from "../../core/schema/types"

export function useEffectiveNode<T extends AnyNode>(node: T): T {
    const override = useLiveOverrides((s) => s.overrides.get(node.id))

    return useMemo(() => (override ? ({ ...node, ...override } as T): node), [node, override])
}