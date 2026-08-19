import mitt from "mitt"
import type { EventMap } from "./types"

export const  emitter = mitt<EventMap>()