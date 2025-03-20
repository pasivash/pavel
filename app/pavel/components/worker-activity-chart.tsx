"use client"

import { useMemo } from "react"
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Record } from "../types"

interface WorkerActivityChartProps {
  records: Record[]
  selectedModel: string | null
  timeRange: { start: number; end: number }
  width: number
  leftPadding: number
}

interface ActivityData {
  time: number
  activeWorkers: number
  isSelectedModel: boolean
}

export function WorkerActivityChart({
  records,
  selectedModel,
  timeRange,
  width,
  leftPadding,
}: WorkerActivityChartProps) {
  const activityData = useMemo(() => {
    if (records.length === 0) return []

    const { start: startTime, end: endTime } = timeRange
    const duration = endTime - startTime
    const periodCount = Math.ceil(duration / 5000) // 5-second periods

    const data: ActivityData[] = new Array(periodCount).fill(null).map((_, i) => ({
      time: startTime + i * 5000,
      activeWorkers: 0,
      isSelectedModel: false,
    }))

    records.forEach((record) => {
      const recordStart = new Date(record.started_at).getTime()
      const recordEnd = new Date(record.completed_at).getTime()
      const startIndex = Math.floor((recordStart - startTime) / 5000)
      const endIndex = Math.min(Math.floor((recordEnd - startTime) / 5000), periodCount - 1)

      for (let i = startIndex; i <= endIndex; i++) {
        if (i >= 0 && i < data.length) {
          data[i].activeWorkers++
          if (selectedModel && record.model === selectedModel) {
            data[i].isSelectedModel = true
          }
        }
      }
    })

    return data
  }, [records, selectedModel, timeRange])

  const formatTime = (time: number) => {
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Worker Activity Over Time</h2>
      <div style={{ height: "100px", width: `${width}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={activityData} margin={{ left: leftPadding, right: 10, top: 10, bottom: 0 }}>
            <YAxis />
            <Tooltip
              labelFormatter={formatTime}
              formatter={(value: number, name: string) => [`${value} workers`, "Active Workers"]}
            />
            <Line type="stepAfter" dataKey="activeWorkers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            {activityData.some((d) => d.isSelectedModel) && (
              <Line
                type="stepAfter"
                dataKey="isSelectedModel"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={false}
                strokeOpacity={0.5}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

