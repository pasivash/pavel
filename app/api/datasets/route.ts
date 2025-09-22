import { NextResponse } from "next/server"

import { createDataset } from "@/lib/dataset-store"
import { parseUploadedData } from "@/app/pavel/utils/data-parsing"

type JsonBody = {
  run_results?: unknown
  runResults?: unknown
  graph_summary?: unknown
  graphSummary?: unknown
  links?: unknown
}

const parseBodyField = (value: unknown): unknown => {
  if (typeof value === "string") {
    return JSON.parse(value)
  }

  return value
}

const parseJsonPayload = async (request: Request) => {
  const body = (await request.json()) as JsonBody

  const runResultsRaw = body.run_results ?? body.runResults
  const graphSummaryRaw = body.graph_summary ?? body.graphSummary ?? body.links

  if (runResultsRaw === undefined || graphSummaryRaw === undefined) {
    throw new Error("Both run_results and graph_summary payloads are required.")
  }

  return {
    runResults: parseBodyField(runResultsRaw),
    graphSummary: parseBodyField(graphSummaryRaw),
  }
}

const parseFormDataPayload = async (request: Request) => {
  const formData = await request.formData()

  const runResultsEntry = formData.get("run_results") ?? formData.get("runResults")
  const graphSummaryEntry =
    formData.get("graph_summary") ?? formData.get("graphSummary") ?? formData.get("links")

  if (!runResultsEntry || !graphSummaryEntry) {
    throw new Error("Form data requests must include run_results and graph_summary fields.")
  }

  const readEntry = async (entry: FormDataEntryValue) => {
    if (entry instanceof File) {
      const text = await entry.text()
      return JSON.parse(text)
    }

    return JSON.parse(entry)
  }

  return {
    runResults: await readEntry(runResultsEntry),
    graphSummary: await readEntry(graphSummaryEntry),
  }
}

export const POST = async (request: Request) => {
  try {
    const contentType = request.headers.get("content-type") ?? ""

    let payload: { runResults: unknown; graphSummary: unknown }

    if (contentType.includes("application/json")) {
      payload = await parseJsonPayload(request)
    } else if (contentType.includes("multipart/form-data")) {
      payload = await parseFormDataPayload(request)
    } else {
      throw new Error(
        "Unsupported content type. Use application/json or multipart/form-data to upload datasets.",
      )
    }

    const { records, links } = parseUploadedData(payload.runResults, payload.graphSummary)
    const { datasetId, token } = createDataset(records, links)

    const datasetUrl = new URL(request.url)
    datasetUrl.pathname = "/pavel/res"
    datasetUrl.searchParams.set("dataset", datasetId)
    datasetUrl.searchParams.set("token", token)
    datasetUrl.hash = ""

    return NextResponse.json(
      {
        datasetId,
        token,
        url: datasetUrl.toString(),
        records: records.length,
        links: links.length,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Failed to create dataset:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 400 },
    )
  }
}

