const CLICK_SLOP_PX = 4

let downX = 0
let downY = 0
let armed = false

export function beginGesture(e: { clientX: number; clientY: number }): void {
    downX = e.clientX
    downY = e.clientY
    armed = true
}

export function isClickGesture(e: { clientX: number; clientY: number }): boolean {
    if (!armed) return false
    const dx = e.clientX - downX
    const dy = e.clientY - downY
    return dx * dx + dy * dy <= CLICK_SLOP_PX * CLICK_SLOP_PX
}