import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import type { Record } from "../types"

interface CriticalPathSummaryProps {
  criticalPath: string[]
  records: Record[]
  onModelSelect: (model: string) => void
}

export function CriticalPathSummary({ criticalPath, records, onModelSelect }: CriticalPathSummaryProps) {
  const [showFullPath, setShowFullPath] = useState(false)

  const totalDuration = criticalPath.reduce((total, model) => {
    const record = records.find((r) => r.model === model)
    if (record) {
      return total + (new Date(record.completed_at).getTime() - new Date(record.started_at).getTime())
    }
    return total
  }, 0)

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }

  const toggleFullPath = () => {
    setShowFullPath(!showFullPath)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Critical Path</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <span className="font-medium">Length: {criticalPath.length} models</span>
          <span className="mx-2">|</span>
          <span className="font-medium">Total duration: {formatDuration(totalDuration)}</span>
        </div>
        <div className="text-sm text-primary cursor-pointer underline mb-2" onClick={toggleFullPath}>
          {showFullPath ? "Hide full path" : "Show full path"}
        </div>
        {showFullPath && (
          <div className="text-sm">
            {criticalPath.map((model, index) => (
              <React.Fragment key={model}>
                <span className="font-medium cursor-pointer underline" onClick={() => onModelSelect(model)}>
                  {model}
                </span>
                {index < criticalPath.length - 1 && (
                  <ArrowRight className="inline-block mx-1 text-blue-500" size={16} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

