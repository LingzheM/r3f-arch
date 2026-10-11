import { create } from "zustand";
import type { AnyNodeId } from "../../core/schema/types";
import type { ViewMode } from "../../core/services/view-pose";

export type Tool = 'select' | 'wall' | 'slab' | 'ceiling' | 'column' | 'door' | 'window'

export type { ViewMode }

type EditorState = {
    activeTool: Tool
    viewMode: ViewMode
    selectId: AnyNodeId | null
    currentLevelId: AnyNodeId | null
    /** 适配的触发器。不是状态，是计数 */
    fitToken: number

    setActiveTool: (t: Tool) => void
    setViewMode: (m: ViewMode) => void
    toggleViewMode: () => void
    select: (id: AnyNodeId | null) => void
    setCurrentLevel: (id: AnyNodeId | null) => void
    requestFit: () => void
}

export const useEditor = create<EditorState>((set) => ({
    activeTool: 'wall',
    viewMode: '3d',
    selectId: null,
    currentLevelId: null,
    fitToken: 0,

    setActiveTool: (activeTool) => set({ activeTool }),
    setViewMode: (viewMode) => set({ viewMode }),
    toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === '3d' ? 'plan' : '3d' })),
    select: (selectId) => set({ selectId }),
    setCurrentLevel: (currentLevelId) => set({ currentLevelId, selectId: null }),

    /**
     * CameraRig 的 effect 依赖数组是 `[mode, fitToken]`, 
     * 
     */
    requestFit: () => set((s) => ({ fitToken: s.fitToken + 1 })),
}))