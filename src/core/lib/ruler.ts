/**
 * 标尺刻度与长度格式化。纯数字，不知道相机，不知道DOM。
 * 
 * 可见世界区间由 viewer 的 orthoWorldWindow 从正交相机算出来，
 * 这里只回答[这段区间应该画哪些刻度]。
 */


export const RULER_STEPS = [0.1, 0.5, 1, 5, 10] as const

export const MAX_RULER_TICKS = 200

export type RulerTicks = {
  step: number
  ticks: number[]
}

export function rulerTicks(
  min: number,
  max: number,
  pxPerMetre: number,
  minPx = 48,
): RulerTicks {
  const last = RULER_STEPS[RULER_STEPS.length - 1]!
  const step = RULER_STEPS.find((s) => s * pxPerMetre >= minPx) ?? last

  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) {
    return { step, ticks: [] }
  }

  const first = Math.ceil(min / step)
  const stop = Math.floor(max / step)

  const ticks: number[] = []
  for (let k = first; k <= stop && ticks.length < MAX_RULER_TICKS; k += 1) {
    ticks.push(Number((k * step).toFixed(3)))
  }

  return { step, ticks }
}

export function formatMetres(v: number): string {
  if (!Number.isFinite(v)) return '-'

  const safe = Math.abs(v) < 0.005 ? 0 : v
  return `${safe.toFixed(2)} m`
}