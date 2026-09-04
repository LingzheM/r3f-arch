import { create } from "zustand"
import { IDLE_SCOPE, selectionEnabled, type ActiveInteractionScope, type InteractionScope, type scopeOfKind } from "../lib/interaction/scope"

type ActiveKind = ActiveInteractionScope['kind']

type InteractionScopeState = {
    scope: InteractionScope
    begin: (scope: ActiveInteractionScope) => void
    update: <K extends ActiveKind>(kind: K, patch: Partial<scopeOfKind<K>>) => void
    end: () => void
    endIf: (match: (s: ActiveInteractionScope) => boolean) => void
}

export const useInteractionScope = create<InteractionScopeState>((set, get) => ({
    scope: IDLE_SCOPE,

    begin: (scope) => set({ scope }),

    update: (kind, patch) =>
        set((state) => {
            if (state.scope.kind !== kind) return state
            return { scope: { ...state.scope, ...patch } as InteractionScope }
        }),

    end: () => {
        if (get().scope.kind === 'idle') return
        set({ scope: IDLE_SCOPE })
    },

    endIf: (match) => {
        const scope = get().scope
        if (scope.kind === 'idle') return
        if (match(scope)) set({ scope: IDLE_SCOPE })
    },
}))

export const getScope = (): InteractionScope => useInteractionScope.getState().scope

export const isSelectionEnabled = (): boolean => selectionEnabled(getScope())