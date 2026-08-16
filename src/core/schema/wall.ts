import { z } from 'zod'
import { BaseNode, nodeType, objectId } from "./base"

export const DEFAULT_WALL_THICKNESS = 0.1

export const DEFAULT_WALL_HEIGHT = 2.5

export const WallNode = BaseNode.extend({ 
    id: objectId('wall'),
    type: nodeType('wall'),
    thickness: z.number().optional(),
    height: z.number().optional(),
})

export function getWallThickness(wall: WallNode): number {
    return wall.thickness
}

export function getWallHeight(wall: WallNode): number {
    return wall.height
}

export type WallNode = z.infer<typeof WallNode>