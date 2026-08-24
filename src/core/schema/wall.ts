import { z } from 'zod'
import { BaseNode, nodeType, objectId } from "./base"
import type { Point2D } from '../lib/geometry-2d'

export const DEFAULT_WALL_THICKNESS = 0.1

export const DEFAULT_WALL_HEIGHT = 2.5

export const WallNode = BaseNode.extend({ 
    id: objectId('wall'),
    type: nodeType('wall'),
    start: z.tuple([z.number(), z.number()]),
    end: z.tuple([z.number(), z.number()]),
    thickness: z.number().positive().optional(),
    height: z.number().positive().optional(),
})

export const getWallThickness = (wall: WallNode) => wall.thickness ?? DEFAULT_WALL_THICKNESS
export const getWallHeight = (wall: WallNode) => wall.height ?? DEFAULT_WALL_HEIGHT

export type WallNode = z.infer<typeof WallNode>

export const wallStart = (w: WallNode): Point2D => ({ x: w.start[0], y: w.start[1] })
export const wallEnd = (w: WallNode): Point2D => ({ x: w.end[0], y: w.end[1] })