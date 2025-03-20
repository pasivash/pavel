export interface Record {
  worker: string
  started_at: string
  completed_at: string
  model: string
}

export interface Link {
  source: string
  target: string
}

export interface ProcessedRecord {
  worker: string
  model: string
  start: Date
  end: Date
  duration_sec: number
  startTime: number
  endTime: number
}

