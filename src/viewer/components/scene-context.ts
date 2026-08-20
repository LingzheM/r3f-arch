import { createContext } from "react"
import { EMPTY_MITER_DATA, type MiterData } from "../../core/systems/wall/wall-mitering"
import type { AnyNodeId } from "../../core/schema/types"

export const MiterContext = createContext<MiterData>(EMPTY_MITER_DATA)

export const SelectionContext = createContext<AnyNodeId | null>(null)