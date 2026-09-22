import { create } from "zustand";
import type { LoadReport } from "../../core/persistence/normalize-snapshot";
import type { AutosaveStatus } from "../persistence/autosave";

export type SaveStatus = AutosaveStatus | 'idle' | 'disabled'

type PersistenceState = {
  currentSceneId: string | null
  currentSceneName: string | null
  saveStatus: SaveStatus
  lastReport: { fromVersion: number; report: LoadReport } | null
  lastError: string | null
  revision: number

  setCurrentScene: (id: string | null, name: string | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setReport: (report: { fromVersion: number; report: LoadReport } | null) => void
  setError: (message: string | null) => void
  bumpRevision: () => void
}

export const usePersistence = create<PersistenceState>((set) => ({
  currentSceneId: null,
  currentSceneName: null,
  saveStatus: 'idle',
  lastReport: null,
  lastError: null,
  revision: 0,

  setCurrentScene: (currentSceneId, currentSceneName) => set({ currentSceneId, currentSceneName }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setReport: (lastReport) => set({ lastReport }),
  setError: (lastError) => set({ lastError }),
  bumpRevision: () => set((s) => ({ revision: s.revision + 1 })),
}))
