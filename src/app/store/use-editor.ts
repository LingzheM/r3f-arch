import { create } from "zustand";
import type { AnyNodeId } from "../../core/schema/types";

export type Tool = 'select' | 'wall'
export type ViewMode = '3d' | 'plan'

type EditorState = {
    activeTool: Tool
    viewMode: ViewMode
    selectId: AnyNodeId | null
    setActiveTool: (t: Tool) => void
    toggleViewMode: () => void
    select: (id: AnyNodeId | null) => void
}

export const useEditor = create<EditorState>((set) => ({
    activeTool: 'wall',
    viewMode: '3d',
    selectId: null,
    setActiveTool: (activeTool) => set({ activeTool }),
    toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === '3d' ? 'plan' : '3d' })),
    select: (selectId) => set({ selectId }),
}))