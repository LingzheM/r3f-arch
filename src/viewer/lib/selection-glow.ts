export const SELECTION_EMISSIVE = '#1f8f7a'
export const SELECTION_EMISSIVE_INTENSITY = 0.35

export type SelectionGlow = {
  emissive: string
  emissiveIntensity: number
}

export function SelectionGlow(selected: boolean): SelectionGlow {
  return selected
    ? { emissive: SELECTION_EMISSIVE, emissiveIntensity: SELECTION_EMISSIVE_INTENSITY }
    : { emissive: '#000000', emissiveIntensity: 0 }
}