import { create } from "zustand"
import type { Record, Link } from "./types"

interface DataStore {
  records: Record[]
  links: Link[]
  setData: (records: Record[], links: Link[]) => void
}

export const useDataStore = create<DataStore>((set) => ({
  records: [],
  links: [],
  setData: (records, links) => set({ records, links }),
}))

