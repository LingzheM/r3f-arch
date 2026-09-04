import { z } from 'zod'
import { BaseNode, nodeType, objectId } from './base'

export const DEFAULT_COLUMN_HEIGHT = 2.5
export const DEFAULT_COLUMN_RADIUS = 0.15
export const DEFAULT_COLUMN_SIZE = 0.3

export const ColumnCrossSection = z.enum(['round', 'square'])
export type ColumnCrossSection = z.infer<typeof ColumnCrossSection>

export const ColumnNode = BaseNode.extend({
  id: objectId('column'),
  type: nodeType('column'),

  // [x, y, z] 世界坐标，y是柱底标高
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),

  crossSection: ColumnCrossSection.default('round'),
  radius: z.number().positive().optional(),
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  height: z.number().positive().optional(),
})

export type ColumnNode = z.infer<typeof ColumnNode>

export const getColumnHeight = (c: ColumnNode) => c.height ?? DEFAULT_COLUMN_HEIGHT
export const getColumnRadius = (c: ColumnNode) => c.radius ?? DEFAULT_COLUMN_RADIUS
export const getColumnWidth = (c: ColumnNode) => c.width ?? DEFAULT_COLUMN_SIZE
export const getColumnDepth = (c: ColumnNode) => c.depth ?? DEFAULT_COLUMN_SIZE