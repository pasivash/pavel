import { NextResponse } from "next/server"

import { getDataset } from "@/lib/dataset-store"

export const GET = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  const token = new URL(request.url).searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Missing dataset access token." }, { status: 401 })
  }

  const dataset = getDataset(params.id, token)

  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found, expired, or token is invalid." }, { status: 404 })
  }

  return NextResponse.json({ records: dataset.records, links: dataset.links })
}

