import { createContext } from "react"
import type { AnyNodeId } from "../../core/schema/types"

export const SelectionContext = createContext<AnyNodeId | null>(null)