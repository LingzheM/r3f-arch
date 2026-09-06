import z from "zod"

export const DEFAULT_DOOR_WIDTH = 0.9
export const DEFAULT_DOOR_HEIGHT = 2.1
export const DEFAULT_WINDOW_WIDHT = 1.2
export const DEFAULT_WINDOW_HEIGHT = 1.2
export const DEFAULT_WINDOW_SILL = 0.9

export const OpeningPlacement = z.tuple([z.number(), z.number(), z.number()])

export const OpeningSide = z.enum(['left', 'right'])
export type OpeningSide = z.infer<typeof OpeningSide>


export type OpeningLike = {
  position: readonly [number, number, number]
  width: number
  height: number
}

export type OpengingSpan = { left: number; right: number; bottom: number; top: number }

export function openingSpan(o: OpeningLike): OpengingSpan {
  const halfWidth = o.width / 2
  const halfHeight = o.height / 2

  return {
    left: o.position[0] - halfWidth,
    right: o.position[0] + halfWidth,
    bottom: o.position[1] - halfHeight,
    top: o.position[1] + halfHeight,
  }
}