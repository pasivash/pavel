"use client"

import { useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { Record, Link } from "../types"
import { formatDuration } from "../utils/time-utils"

interface ModelDetailsProps {
  model: string | null
  records: Record[]
  links: Link[]
  onModelSelect: (model: string) => void
}

export function ModelDetails({ model, records, links, onModelSelect }: ModelDetailsProps) {
  const details = useMemo(() => {
    if (!model) return null

    const record = records.find((r) => r.model === model)
    if (!record) return null

    const parents = links.filter((link) => link.target === model).map((link) => link.source)
    const children = links.filter((link) => link.source === model).map((link) => link.target)

    // Check if parents and children exist in the records
    const existingParents = parents.filter((parent) => records.some((r) => r.model === parent))
    const existingChildren = children.filter((child) => records.some((r) => r.model === child))

    return {
      ...record,
      parents,
      children,
      existingParents,
      existingChildren,
    }
  }, [model, records, links])

  return (
    <Card className="h-full overflow-auto bg-white lg:max-h-[calc(100vh-2rem)]">
      <CardHeader className="bg-white sticky top-0 z-10">
        <CardTitle>Model Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 bg-white">
        {details ? (
          <>
            <div>
              <h3 className="font-semibold">Model</h3>
              <p className="text-sm break-words">{details.model}</p>
            </div>
            <div>
              <h3 className="font-semibold">Worker</h3>
              <p className="text-sm">{details.worker}</p>
            </div>
            <div>
              <h3 className="font-semibold">Execution Time</h3>
              <p className="text-sm">Started: {new Date(details.started_at).toLocaleString()}</p>
              <p className="text-sm">Completed: {new Date(details.completed_at).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="font-semibold">Duration</h3>
              <p className="text-sm">
                {formatDuration(new Date(details.completed_at).getTime() - new Date(details.started_at).getTime())}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Parents ({details.parents.length})</h3>
              <ul className="text-sm list-disc pl-4 space-y-1">
                {details.parents.map((parent) => (
                  <li
                    key={parent}
                    className={`break-words ${
                      details.existingParents.includes(parent)
                        ? "text-primary cursor-pointer underline"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => details.existingParents.includes(parent) && onModelSelect(parent)}
                  >
                    {parent}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Children ({details.children.length})</h3>
              <ul className="text-sm list-disc pl-4 space-y-1">
                {details.children.map((child) => (
                  <li
                    key={child}
                    className={`break-words ${
                      details.existingChildren.includes(child)
                        ? "text-primary cursor-pointer underline"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => details.existingChildren.includes(child) && onModelSelect(child)}
                  >
                    {child}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Select a model to view details</p>
        )}
      </CardContent>
    </Card>
  )
}

