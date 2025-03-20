export interface Record {
  model: string
  worker: string
  started_at: string
  completed_at: string
  duration?: number
}

export interface Link {
  source: string
  target: string
}

export interface ProcessedRecord extends Record {
  start: number
  end: number
  duration: number
} 