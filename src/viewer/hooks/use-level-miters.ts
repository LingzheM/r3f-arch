import { useMemo } from "react";
import { useScene } from "../../core/store/use-scene";
import { calculateLevelMiters, type MiterData } from "../../core/systems/wall/wall-mitering";
import { WallNode } from "../../core/schema/wall";
import { useLiveOverrides } from "../../core/store/use-live-overrides";

export function useLevelMiters(): MiterData {
    const nodes = useScene((s) => s.nodes)
    const overrides = useLiveOverrides((s) => s.overrides)
    return useMemo(() => {
        const walls: WallNode[] = []
        for (const node of Object.values(nodes)) {
            if (node.type !== 'wall') continue
            const override = overrides.get(node.id)
            walls.push(override ? ({ ...node, ...override } as WallNode): node)
        }
        return calculateLevelMiters(walls)
    }, [nodes, overrides])
}