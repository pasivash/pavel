import { create } from "zustand"
import type { Record, Link } from "./types"

interface DataStore {
  records: Record[]
  links: Link[]
  zoomRange: { start: number; end: number } | null
  setData: (records: Record[], links: Link[]) => void
  setZoomRange: (range: { start: number; end: number } | null) => void
}

export const useDataStore = create<DataStore>((set) => ({
  records: [],
  links: [],
  zoomRange: null,
  setData: (records, links) => set({ records, links }),
  setZoomRange: (range) => set({ zoomRange: range }),
}))

