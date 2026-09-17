import { loadSceneDocument } from "./load-scene-document"

const load = (value: unknown) => {
  const r = loadSceneDocument(structuredClone(value))
  if (!r.ok) throw new Error(`load failed: ${JSON.stringify(r.error)}`)
  return r
}