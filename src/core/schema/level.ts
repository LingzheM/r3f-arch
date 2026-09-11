import z from "zod"
import { BaseNode, nodeType, objectId } from "./base"

export const DEFAULT_LEVEL_HEIGHT = 2.5

export const LevelNode = BaseNode.extend({
  id: objectId('level'),
  type: nodeType('level'),

  level: z.number().default(0),

  baseElevation: z.number().default(0),

  height: z.number().positive().optional(),
})

export type LevelNode = z.infer<typeof LevelNode>

export const getStoredLevelHeight = (level: Pick<LevelNode, 'height'>): number => level.height ?? DEFAULT_LEVEL_HEIGHT