import type { AnyNodeId } from "../../core/schema/types"
import { useScene } from "../../core/store/use-scene"
import { WallRenderer } from "./wall-renderer"
import { useLevelMiters } from "../hooks/use-level-miters"
import { MiterContext } from "./scene-context"

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
        case 'wall': 
            return <WallRenderer node={node} />
        default: return null
    }
}