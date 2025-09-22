import type { Link, Record as ExecutionRecord } from "@/app/pavel/types"

interface StoredDataset {
  records: ExecutionRecord[]
  links: Link[]
  createdAt: number
  token: string
}

const DATASET_TTL_MS = 1000 * 60 * 60 // 1 hour

const datasets = new Map<string, StoredDataset>()

const cleanupExpiredDatasets = () => {
  const now = Date.now()
  for (const [id, dataset] of datasets.entries()) {
    if (now - dataset.createdAt > DATASET_TTL_MS) {
      datasets.delete(id)
    }
  }
}

export const createDataset = (
  records: ExecutionRecord[],
  links: Link[],
): { datasetId: string; token: string } => {
  cleanupExpiredDatasets()

  const datasetId = crypto.randomUUID()
  const token = crypto.randomUUID()
  datasets.set(datasetId, { records, links, createdAt: Date.now(), token })

  return { datasetId, token }
}

export const getDataset = (datasetId: string, token: string): StoredDataset | null => {
  cleanupExpiredDatasets()

  const dataset = datasets.get(datasetId)
  if (!dataset || dataset.token !== token) {
    return null
  }

  return dataset
}

