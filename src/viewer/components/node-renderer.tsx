import { createContext } from "react"
import type { AnyNodeId } from "../../core/schema/types"
import { useScene } from "../../core/store/use-scene"
import { WallRenderer } from "./wall-renderer"
import { EMPTY_MITER_DATA, type MiterData } from "../../core/systems/wall/wall-mitering"
import { useLevelMiters } from "../hooks/use-level-miters"

export const MiterContext = createContext<MiterData>(EMPTY_MITER_DATA)

export const SceneRenderer = () => {
    const rootNodeIds = useScene((state) => state.rootNodeIds)

    const miter = useLevelMiters()

    return (
        <MiterContext.Provider value={miter}>
          <group name="scene-renderer">
            {rootNodeIds.map((nodeId) => <NodeRenderer key={nodeId} nodeId={nodeId} />)}
          </group>
        </MiterContext.Provider>

    )
}

export const NodeRenderer = ({ nodeId }: { nodeId: AnyNodeId }) => {
    const node = useScene((state) => state.nodes[nodeId])
    if (!node) return null
    switch (node.type) {
        case 'wall': return <WallRenderer node={node} />
        default: return null
    }
}