import z from "zod"

export const DEFAULT_DOOR_WIDTH = 0.9
export const DEFAULT_DOOR_HEIGHT = 2.1
export const DEFAULT_WINDOW_WIDHT = 1.2
export const DEFAULT_WINDOW_HEIGHT = 1.2
export const DEFAULT_WINDOW_SILL = 0.9

export const OpeningPlacement = z.tuple([z.number(), z.number(), z.number()])

export const OpeningSide = z.enum(['left', 'right'])