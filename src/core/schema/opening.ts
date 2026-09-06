import z from "zod"

export const DEFAULT_DOOR_WIDTH = 0.9
export const DEFAULT_DOOR_HEIGHT = 2.1


export const OpeningPlacement = z.tuple([z.number(), z.number(), z.number()])

export const OpeningSide = z.enum(['left', 'right'])