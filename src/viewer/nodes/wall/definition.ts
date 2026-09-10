import type { NodeDefinition } from "../../../core/registry/node-definition";
import type { WallNode } from "../../../core/schema/wall";
import type { MiterData } from "../../../core/systems/wall/wall-mitering";
import { buildWallGeometry, computeWallLevelMiters, wallTransform } from "./geometry";

export const wallDefinition: NodeDefinition<WallNode, MiterData> = {
    kind: 'wall',
    frame: wallTransform,
    geometry: buildWallGeometry,
    computeLevelData: computeWallLevelMiters,
}