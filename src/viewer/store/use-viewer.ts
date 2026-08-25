import { create } from "zustand"

type ViewerState = {
    cameraDragging: boolean
    setCameraDragging: (v: boolean) => void

    inputDragging: boolean
    setInputDragging: (v: boolean) => void
}

export const useViewer = create<ViewerState>((set) => (
    {
        cameraDragging: false,
        setCameraDragging: (cameraDragging) => set({ cameraDragging }),
        
        inputDragging: false,
        setInputDragging: (inputDragging) => set({ inputDragging }),
    }
))