import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { WallNode } from "../../../core/schema/wall";
import type { MiterData } from "../../../core/systems/wall/wall-mitering";
import { buildWallGeometry, computeWallLevelMiters } from "./geometry";

export const wallDefinition: NodeDefinition<WallNode, MiterData> = {
    kind: 'wall',
    geometry: buildWallGeometry,
    computeLevelData: computeWallLevelMiters,
}