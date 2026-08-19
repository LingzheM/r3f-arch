import { z } from 'zod'
import { WallNode } from './wall'

export const AnyNode = z.discriminatedUnion('type', [WallNode])

export type AnyNode = z.infer<typeof AnyNode>
export type AnyNodeId = AnyNode['id']
export type AnyNodeType = AnyNode['type']