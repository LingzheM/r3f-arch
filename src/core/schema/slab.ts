import { z } from 'zod'
import { BaseNode, nodeType, objectId } from './base'

export const DEFAULT_SLAB_THICKNESS = 0.12

export const DEFAULT_SLAB_ELEVATION = 0.05

export const SlabNode = BaseNode.extend({
  id: objectId('slab'),
  type: nodeType('slab'),

  polygon: z.array(z.tuple([z.number(), z.number()])),

  elevation: z.number().default(DEFAULT_SLAB_ELEVATION),
  thickness: z.number().positive().optional(),
})

export type SlabNode = z.infer<typeof SlabNode>

export const getSlabThickness = (slab: SlabNode) => slab.thickness ?? DEFAULT_SLAB_THICKNESS