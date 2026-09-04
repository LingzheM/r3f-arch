import z from "zod";
import { BaseNode, nodeType, objectId } from "./base";
import { DEFAULT_WALL_HEIGHT } from "./wall";

export const DEFAULT_CEILING_HEIGHT = DEFAULT_WALL_HEIGHT
export const DEFAULT_CEILING_THICKNESS = 0.05

export const CeilingNode = BaseNode.extend({
  id: objectId('ceiling'),
  type: nodeType('ceiling'),

  polygon: z.array(z.tuple([z.number(), z.number()])),

  height: z.number().optional(),
  thickness: z.number().positive().optional(),
})

export type CeilingNode = z.infer<typeof CeilingNode>

export const getCeilingHeight = (c: CeilingNode) => c.height ?? DEFAULT_CEILING_HEIGHT
export const getCeilingThickness = (c: CeilingNode) => c.thickness ?? DEFAULT_CEILING_THICKNESS