import type { Link, Record as ExecutionRecord } from "../types"

interface DbtRunResultTimingEntry {
  name: string
  started_at?: string
  completed_at?: string
}

interface DbtRunResult {
  thread_id?: string
  unique_id?: string
  timing?: DbtRunResultTimingEntry[]
}

interface DbtGraphSummaryNode {
  name?: string
  succ?: (string | number)[]
}

interface DbtGraphSummary {
  with_test_edges?: globalThis.Record<string, DbtGraphSummaryNode>
}

const DBT_DATASET_THREAD_ID_TO_IGNORE = "main"

const REQUIRED_TIMING_NAMES = {
  compile: "compile",
  execute: "execute",
} as const

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const hasRequiredTimingEntries = (timing: unknown): timing is DbtRunResultTimingEntry[] => {
  if (!Array.isArray(timing)) {
    return false
  }

  const hasCompile = timing.some((entry) => entry?.name === REQUIRED_TIMING_NAMES.compile)
  const hasExecute = timing.some((entry) => entry?.name === REQUIRED_TIMING_NAMES.execute)

  return hasCompile && hasExecute
}

const extractTimingValue = (
  timing: DbtRunResultTimingEntry[],
  name: string,
  key: "started_at" | "completed_at",
): string | undefined => {
  const entry = timing.find((t) => t?.name === name)
  return entry?.[key]
}

const isDbtRunResults = (value: unknown): value is { results: DbtRunResult[] } =>
  isObject(value) && Array.isArray((value as { results?: unknown }).results)

const isDbtGraphSummary = (value: unknown): value is DbtGraphSummary =>
  isObject(value) && isObject((value as DbtGraphSummary).with_test_edges)

const validateRecords = (records: ExecutionRecord[]): void => {
  const hasInvalidRecord = records.some(
    (record) =>
      typeof record.worker !== "string" ||
      typeof record.started_at !== "string" ||
      typeof record.completed_at !== "string" ||
      typeof record.model !== "string",
  )

  if (hasInvalidRecord) {
    throw new Error("Invalid run results format. Please check your run results file.")
  }
}

const validateLinks = (links: Link[]): void => {
  const hasInvalidLink = links.some(
    (link) => typeof link.source !== "string" || typeof link.target !== "string",
  )

  if (hasInvalidLink) {
    throw new Error("Invalid links format. Please check your links file.")
  }
}

const parseDbtDataset = (runResults: DbtRunResult[], graphSummary: DbtGraphSummary): {
  records: ExecutionRecord[]
  links: Link[]
} => {
  const records: ExecutionRecord[] = runResults
    .filter(
      (result) =>
        result.thread_id &&
        result.thread_id !== DBT_DATASET_THREAD_ID_TO_IGNORE &&
        hasRequiredTimingEntries(result.timing),
    )
    .map((result) => {
      const timing = result.timing as DbtRunResultTimingEntry[]
      const compileStartedAt = extractTimingValue(timing, REQUIRED_TIMING_NAMES.compile, "started_at")
      const executeCompletedAt = extractTimingValue(
        timing,
        REQUIRED_TIMING_NAMES.execute,
        "completed_at",
      )

      if (!compileStartedAt || !executeCompletedAt || !result.unique_id) {
        throw new Error("Invalid dbt run results timing information.")
      }

      return {
        worker: result.thread_id,
        started_at: compileStartedAt,
        completed_at: executeCompletedAt,
        model: result.unique_id,
      }
    })

  const nodes = graphSummary.with_test_edges ?? {}
  const links: Link[] = []

  for (const nodeEntry of Object.values(nodes)) {
    const source = nodeEntry?.name

    if (!source) {
      continue
    }

    const successors = nodeEntry.succ ?? []
    for (const successorId of successors) {
      const successor = nodes[String(successorId)]
      if (successor?.name) {
        links.push({ source, target: successor.name })
      }
    }
  }

  return { records, links }
}

const parseCustomDataset = (runResults: unknown, graphSummary: unknown): {
  records: ExecutionRecord[]
  links: Link[]
} => {
  if (!Array.isArray(runResults) || !Array.isArray(graphSummary)) {
    throw new Error("Custom datasets must provide arrays for run results and links.")
  }

  const records = runResults as ExecutionRecord[]
  const links = graphSummary as Link[]

  validateRecords(records)
  validateLinks(links)

  return { records, links }
}

export const parseUploadedData = (runResults: unknown, graphSummary: unknown): {
  records: ExecutionRecord[]
  links: Link[]
} => {
  if (isDbtRunResults(runResults) && isDbtGraphSummary(graphSummary)) {
    const dataset = parseDbtDataset(runResults.results, graphSummary)
    validateRecords(dataset.records)
    validateLinks(dataset.links)
    return dataset
  }

  return parseCustomDataset(runResults, graphSummary)
}

