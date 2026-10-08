/**
 * 层高输入框失焦时的提交判据。
 */
export function commitLevelHeight(raw: string): number | null {
  const value = Number(raw)

  if (!Number.isFinite(value)) return null
  if (value <= 0) return null

  return value
}