import { create } from "zustand"
import { IDLE_SCOPE, selectionEnabled, type ActiveInteractionScope, type InteractionScope } from "../lib/interaction/scope"

type InteractionScopeState = {
    scope: InteractionScope
    begin: (scope: ActiveInteractionScope) => void
    update: (patch: Partial<ActiveInteractionScope>) => void
    end: () => void
    endIf: (match: (s: ActiveInteractionScope) => boolean) => void 
}

export const useInteractionScope = create<InteractionScopeState>((set, get) => ({
    scope: IDLE_SCOPE,

    begin: (scope) => set({ scope }),

    update: (patch) => 
        set((state) => {
            if (state.scope.kind === 'idle') return state
        
            if ('kind' in patch && patch.kind !== state.scope.kind) return state
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