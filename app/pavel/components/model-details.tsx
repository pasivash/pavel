"use client"

import { useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { Record, Link } from "../types"
import { formatDuration } from "../utils/time-utils"
import { calculateCriticalPathToModel } from "../utils/critical-path"

interface ModelDetailsProps {
  model: string | null
  records: Record[]
  links: Link[]
  onModelSelect: (model: string) => void
  onViewChange?: (view: 'lineage' | 'critical-path', criticalPath: string[]) => void
}

export function ModelDetails({ model, records, links, onModelSelect, onViewChange }: ModelDetailsProps) {
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

  const criticalPathToModel = useMemo(() => {
    if (!model) return []
    return calculateCriticalPathToModel(records, links, model)
  }, [model, records, links])

  const criticalPathDuration = useMemo(() => {
    if (criticalPathToModel.length === 0) return 0
    return criticalPathToModel.reduce((total, modelName) => {
      const record = records.find((r) => r.model === modelName)
      if (!record) return total
      return total + (new Date(record.completed_at).getTime() - new Date(record.started_at).getTime())
    }, 0)
  }, [criticalPathToModel, records])

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

            <Tabs 
              defaultValue="lineage" 
              className="w-full"
              onValueChange={(value) => {
                const view = value as 'lineage' | 'critical-path'
                onViewChange?.(view, view === 'critical-path' ? criticalPathToModel : [])
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lineage">Lineage</TabsTrigger>
                <TabsTrigger value="critical-path">Critical Path</TabsTrigger>
              </TabsList>
              
              <TabsContent value="lineage" className="space-y-4">
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
              </TabsContent>
              
              <TabsContent value="critical-path" className="space-y-4">
                <div>
                  <h3 className="font-semibold">Critical Path ({criticalPathToModel.length} models)</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Longest path from start to this model
                  </p>
                  <p className="text-sm font-medium mb-2">
                    Total Duration: {formatDuration(criticalPathDuration)}
                  </p>
                  <ol className="text-sm space-y-1">
                    {criticalPathToModel.map((modelName, index) => {
                      const modelRecord = records.find((r) => r.model === modelName)
                      const duration = modelRecord
                        ? new Date(modelRecord.completed_at).getTime() - new Date(modelRecord.started_at).getTime()
                        : 0
                      const isCurrent = modelName === model
                      
                      return (
                        <li
                          key={modelName}
                          className={`break-words ${
                            isCurrent
                              ? "text-primary font-semibold"
                              : "text-primary cursor-pointer underline"
                          }`}
                          onClick={() => !isCurrent && onModelSelect(modelName)}
                        >
                          {index + 1}. {modelName} ({formatDuration(duration)})
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-muted-foreground">Select a model to view details</p>
        )}
      </CardContent>
    </Card>
  )
}

