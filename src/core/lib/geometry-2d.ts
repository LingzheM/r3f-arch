export type Point2D = { x:number; y:number }

export function sub(a: Point2D, b: Point2D): Point2D

export function len(v: Point2D): number

export function normalize(v: Point2D): Point2D

export function leftNormal(v: Point2D): Point2D

export function wallFootprint(start: Point2D, end: Point2D, thickness: number): Point2D[]
