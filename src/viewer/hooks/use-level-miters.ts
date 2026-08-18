import { useMemo } from "react";
import { useScene } from "../../core/store/use-scene";
import { calculateLevelMiters, type MiterData } from "../../core/systems/wall/wall-mitering";
import { WallNode } from "../../core/schema/wall";

export function useLevelMiters(): MiterData {
    const nodes = useScene((s) => s.nodes)
    return useMemo(() => {
        const walls = Object.values(nodes).filter((n): n is WallNode => n.type === 'wall')
        return calculateLevelMiters(walls)
    }, [nodes])
}