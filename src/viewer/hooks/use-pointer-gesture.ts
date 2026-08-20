import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import { beginGesture } from "../lib/pointer-gesture"


export function usePointerGesture(): void {
    const gl = useThree((s) => s.gl)

    useEffect(() => {
        const el = gl.domElement
        const onDown = (e: PointerEvent) => beginGesture(e)

        el.addEventListener('pointerdown', onDown, { capture: true })
    }, [gl])
}