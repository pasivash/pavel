"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Record, Link, ProcessedRecord } from "../../types"
import { CriticalPathConnections } from "./CriticalPathConnections"
import { Network } from "lucide-react"

interface TimelineProps {
  records: Record[]
  links: Link[]
  selectedModel: string | null
  onModelSelect: (model: string | null) => void
  criticalPath: string[]
  showCriticalPathOnChart: boolean
  onToggleCriticalPath: () => void
}

export function Timeline({
  records,
  links,
  selectedModel,
  onModelSelect,
  criticalPath,
  showCriticalPathOnChart,
  onToggleCriticalPath,
}: TimelineProps) {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; record: any } | null>(null)
  const [activityTooltip, setActivityTooltip] = useState<{
    x: number
    y: number
    activeWorkers: number
    time: number
  } | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: number; end: number } | null>(null)
  const [hoverIndicator, setHoverIndicator] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  const [dimensions, setDimensions] = useState({
    width: 900,
    minWidth: 400,
    height: 0,
    leftPadding: 150,
    rightPadding: 70,
    topPadding: 120,
    bottomPadding: 30,
    rowHeight: 30,
    barHeight: 15,
    workerActivityHeight: 60,
    workerActivityTopMargin: 20,
    xAxisGap: 15,
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        setDimensions((prev) => ({
          ...prev,
          width: Math.max(prev.minWidth, containerWidth - prev.leftPadding - prev.rightPadding),
        }))
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const { workers, timeRange, workerData, workerActivityData } = useMemo(() => {
    const processed = records.map((record) => ({
      model: record.model,
      worker: record.worker,
      start: new Date(record.started_at).getTime(),
      end: new Date(record.completed_at).getTime(),
      duration: (new Date(record.completed_at).getTime() - new Date(record.started_at).getTime()) / 1000,
    }))

    const workers = [...new Set(processed.map((r) => r.worker))].sort((a, b) => {
      const aNum = Number.parseInt(a.match(/\d+/)?.[0] || "0")
      const bNum = Number.parseInt(b.match(/\d+/)?.[0] || "0")
      return aNum - bNum
    })

    setDimensions((prev) => ({
      ...prev,
      height: workers.length * prev.rowHeight,
    }))

    const workerData = new Map()
    workers.forEach((worker) => {
      workerData.set(
        worker,
        processed.filter((r) => r.worker === worker),
      )
    })

    const allTimes = processed.flatMap((r) => [r.start, r.end])
    const timeRange = {
      start: Math.min(...allTimes),
      end: Math.max(...allTimes),
    }

    const timestamps = new Set<number>()
    processed.forEach((record) => {
      timestamps.add(record.start)
      timestamps.add(record.end)
    })

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b)
    const workerActivityData = sortedTimestamps.map((time) => ({
      time,
      activeWorkers: processed.filter((r) => r.start <= time && r.end > time).length,
    }))

    return { workers, timeRange, workerData, workerActivityData }
  }, [records])

  const timeToX = useCallback(
    (time: number) => {
      const timeWidth = dimensions.width
      return dimensions.leftPadding + ((time - timeRange.start) / (timeRange.end - timeRange.start)) * timeWidth
    },
    [dimensions.width, dimensions.leftPadding, timeRange],
  )

  const workerToY = useCallback(
    (worker: string) => {
      const index = workers.indexOf(worker)
      return dimensions.topPadding + index * dimensions.rowHeight + (dimensions.rowHeight - dimensions.barHeight) / 2
    },
    [workers, dimensions],
  )

  const getModelPositions = useCallback(
    (modelName: string) => {
      for (const [worker, records] of workerData.entries()) {
        const record = records.find((r: ProcessedRecord) => r.model === modelName)
        if (record) {
          const startX = timeToX(record.start)
          const endX = timeToX(record.end)
          const centerX = startX + (endX - startX) / 2
          const y = workerToY(worker)
          return {
            left: { x: startX, y },
            right: { x: endX, y },
            center: { x: centerX, y },
          }
        }
      }
      return null
    },
    [workerData, timeToX, workerToY],
  )

  const getBarColor = useCallback(
    (duration: number, model: string, isParent: boolean, isChild: boolean) => {
      if (showCriticalPathOnChart && criticalPath.includes(model)) return "rgb(3, 105, 161)"
      if (model === selectedModel) return "rgb(0, 0, 0)"
      if (isParent) return "rgb(234, 179, 8)"
      if (isChild) return "rgb(147, 51, 234)"

      const greenHue = 120
      const yellowHue = 60
      const redHue = 0

      let hue
      let saturation
      let lightness

      if (duration <= 900) {
        hue = greenHue - (duration / 900) * (greenHue - yellowHue)
        saturation = 70 + (duration / 900) * 20
        lightness = 45 + (duration / 900) * 5
      } else if (duration <= 1800) {
        hue = yellowHue - ((duration - 900) / 900) * (yellowHue - redHue)
        saturation = 90 - ((duration - 900) / 900) * 5
        lightness = 50 + ((duration - 900) / 900) * 5
      } else {
        hue = redHue
        saturation = 85
        lightness = 55
      }

      return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    },
    [selectedModel, criticalPath, showCriticalPathOnChart],
  )

  const formatTime = useCallback((time: number) => {
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [])

  const timeAxisTicks = useMemo(() => {
    const ticks = []
    const tickCount = 6
    const timeSpan = timeRange.end - timeRange.start

    for (let i = 0; i <= tickCount; i++) {
      ticks.push(timeRange.start + timeSpan * (i / tickCount))
    }

    return ticks
  }, [timeRange])

  const { relevantLinks, parentModels, childModels } = useMemo(() => {
    if (!selectedModel) return { relevantLinks: [], parentModels: [], childModels: [] }

    const parentModels = links.filter((link) => link.target === selectedModel).map((link) => link.source)
    const childModels = links.filter((link) => link.source === selectedModel).map((link) => link.target)

    const relevantLinks = links
      .filter((link) => link.source === selectedModel || link.target === selectedModel)
      .map((link) => {
        const sourcePos = getModelPositions(link.source)
        const targetPos = getModelPositions(link.target)

        if (!sourcePos || !targetPos) return null

        const isOutgoing = link.source === selectedModel

        return {
          ...link,
          start: isOutgoing ? sourcePos.right : sourcePos.right,
          end: isOutgoing ? targetPos.left : targetPos.left,
          isOutgoing,
          color: isOutgoing ? "rgb(147, 51, 234)" : "rgb(234, 179, 8)",
        }
      })
      .filter(Boolean)

    return { relevantLinks, parentModels, childModels }
  }, [links, selectedModel, getModelPositions])

  const generatePath = useCallback((start: any, end: any) => {
    const deltaX = end.x - start.x
    const controlPointOffset = Math.min(Math.abs(deltaX) * 0.5, 100)

    const cp1x = start.x + controlPointOffset
    const cp2x = end.x - controlPointOffset

    return `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`
  }, [])

  const maxActiveWorkers = Math.max(...workerActivityData.map((d) => d.activeWorkers))

  const workerActivityToY = useCallback(
    (activeWorkers: number, isLabel = false) => {
      const baseY =
        dimensions.topPadding -
        dimensions.workerActivityHeight -
        dimensions.workerActivityTopMargin -
        dimensions.xAxisGap +
        dimensions.workerActivityHeight * (1 - activeWorkers / maxActiveWorkers)
      return isLabel ? baseY + 4 : baseY
    },
    [dimensions, maxActiveWorkers],
  )

  const handleActivityMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      if (!svgRef.current) return

      const svgRect = svgRef.current.getBoundingClientRect()
      const mouseX = event.clientX - svgRect.left - dimensions.leftPadding

      const timeWidth = dimensions.width
      const time = timeRange.start + (mouseX / timeWidth) * (timeRange.end - timeRange.start)

      const closestPoint = workerActivityData.reduce((prev, curr) => {
        return Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
      })

      const x = timeToX(closestPoint.time)
      const y = workerActivityToY(closestPoint.activeWorkers)

      setHoverIndicator({ x, y })
      setActivityTooltip({
        x: event.clientX,
        y: event.clientY,
        activeWorkers: closestPoint.activeWorkers,
        time: closestPoint.time,
      })
    },
    [dimensions, timeRange, workerActivityData, timeToX, workerActivityToY],
  )

  const handleModelSelect = useCallback(
    (model: string | null) => {
      onModelSelect(model)
      if (model) {
        const selectedRecord = Array.from(workerData.values())
          .flat()
          .find((record) => record.model === model)
        if (selectedRecord) {
          setSelectedTimeRange({ start: selectedRecord.start, end: selectedRecord.end })
        }
      } else {
        setSelectedTimeRange(null)
      }
    },
    [onModelSelect, workerData],
  )

  return (
    <Card className="p-4 w-full overflow-x-auto" ref={containerRef}>
      <div style={{ width: "100%", minWidth: `${dimensions.minWidth + 200}px`}}>
        <div className="relative">
          <div className="absolute top-2 right-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onToggleCriticalPath}
                    className={`h-8 w-8 rounded-md ${showCriticalPathOnChart ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    <Network className={`h-4 w-4 ${showCriticalPathOnChart ? "text-white" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="tooltip-content bg-white">
                  {showCriticalPathOnChart ? "Hide Critical Path" : "Show Critical Path"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="w-full">
          {isMounted && (
            <svg
              ref={svgRef}
              width={dimensions.width + dimensions.leftPadding + dimensions.rightPadding}
              height={dimensions.height + dimensions.topPadding + dimensions.bottomPadding}
              className="font-mono text-xs w-full"
            >
              <g className="worker-activity-chart">
                <text
                  x={dimensions.leftPadding - 40}
                  y={dimensions.topPadding - dimensions.workerActivityHeight - dimensions.workerActivityTopMargin - 10}
                  textAnchor="end"
                  className="fill-foreground"
                >
                  Active Workers
                </text>
                {[...new Set([1, Math.floor(maxActiveWorkers / 2), maxActiveWorkers])].map((tick) => (
                  <text
                    key={`worker-activity-tick-${tick}`}
                    x={dimensions.leftPadding - 5}
                    y={workerActivityToY(tick, true)}
                    textAnchor="end"
                    className="fill-muted-foreground"
                  >
                    {tick}
                  </text>
                ))}
                {selectedTimeRange && (
                  <path
                    d={workerActivityData
                      .filter((d) => d.time >= selectedTimeRange.start && d.time <= selectedTimeRange.end)
                      .map((d, i) => `${i === 0 ? "M" : "L"} ${timeToX(d.time)} ${workerActivityToY(d.activeWorkers)}`)
                      .join(" ")}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    opacity="1"
                  />
                )}
                <path
                  d={workerActivityData
                    .map((d, i) => `${i === 0 ? "M" : "L"} ${timeToX(d.time)} ${workerActivityToY(d.activeWorkers)}`)
                    .join(" ")}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity={selectedTimeRange ? "0.3" : "1"}
                />
                {hoverIndicator && (
                  <circle
                    cx={hoverIndicator.x}
                    cy={hoverIndicator.y}
                    r="4"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
                <rect
                  x={dimensions.leftPadding}
                  y={dimensions.topPadding - dimensions.workerActivityHeight - dimensions.workerActivityTopMargin - 30}
                  width={dimensions.width}
                  height={dimensions.workerActivityHeight + dimensions.workerActivityTopMargin + 30}
                  fill="transparent"
                  onMouseMove={handleActivityMouseMove}
                  onMouseLeave={() => {
                    setActivityTooltip(null)
                    setHoverIndicator(null)
                  }}
                  style={{ cursor: "crosshair" }}
                />
              </g>

              <g className="axis top-axis">
                {timeAxisTicks.map((time, i) => (
                  <g key={`top-time-${i}`}>
                    <line
                      x1={timeToX(time)}
                      y1={dimensions.topPadding - 5}
                      x2={timeToX(time)}
                      y2={dimensions.topPadding - 15}
                      stroke="rgb(75, 85, 99)"
                      strokeWidth="1"
                    />
                    <text
                      x={timeToX(time)}
                      y={dimensions.topPadding - 20}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                    >
                      {formatTime(time)}
                    </text>
                  </g>
                ))}
              </g>

              {[...workers, "last"].map((worker, i) => (
                <line
                  key={`grid-${worker}`}
                  x1={dimensions.leftPadding}
                  y1={dimensions.topPadding + i * dimensions.rowHeight}
                  x2={dimensions.width + dimensions.leftPadding}
                  y2={dimensions.topPadding + i * dimensions.rowHeight}
                  stroke="rgb(229, 231, 235)"
                  strokeDasharray="4 4"
                />
              ))}

              <g className="axis bottom-axis">
                {timeAxisTicks.map((time, i) => (
                  <g key={`bottom-time-${i}`}>
                    <line
                      x1={timeToX(time)}
                      y1={dimensions.topPadding + dimensions.height}
                      x2={timeToX(time)}
                      y2={dimensions.height + dimensions.topPadding + 10}
                      stroke="rgb(75, 85, 99)"
                      strokeWidth="1"
                    />
                    <text
                      x={timeToX(time)}
                      y={dimensions.height + dimensions.topPadding + 20}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                    >
                      {formatTime(time)}
                    </text>
                  </g>
                ))}
              </g>

              {workers.map((worker, i) => (
                <text
                  key={`label-${worker}`}
                  x={dimensions.leftPadding - 10}
                  y={dimensions.topPadding + i * dimensions.rowHeight + dimensions.rowHeight / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-foreground"
                >
                  {worker}
                </text>
              ))}

              <g className="connections">
                {relevantLinks.map((link: any, i) => (
                  <path
                    key={`link-${i}`}
                    d={generatePath(link.start, link.end)}
                    stroke={link.color}
                    strokeWidth={1}
                    fill="none"
                    opacity={0.7}
                    className="transition-opacity duration-200"
                  />
                ))}
              </g>

              {Array.from(workerData.entries()).map(([worker, records]: [string, any[]]) =>
                records.map((record, i) => {
                  const x = timeToX(record.start)
                  const width = timeToX(record.end) - x
                  const y = workerToY(worker)
                  const isParent = parentModels.includes(record.model)
                  const isChild = childModels.includes(record.model)

                  return (
                    <g key={`bar-${worker}-${i}`}>
                      <rect
                        x={x}
                        y={y}
                        width={Math.max(width, 2)}
                        height={dimensions.barHeight}
                        fill={getBarColor(record.duration, record.model, isParent, isChild)}
                        opacity={selectedModel ? (record.model === selectedModel || isParent || isChild ? 1 : 0.3) : 1}
                        rx={4}
                        className="cursor-pointer transition-opacity duration-200"
                        onClick={() => handleModelSelect(record.model === selectedModel ? null : record.model)}
                        onMouseEnter={(e) => {
                          setHoveredModel(record.model)
                          setTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            record,
                          })
                        }}
                        onMouseLeave={() => {
                          setHoveredModel(null)
                          setTooltip(null)
                        }}
                      />
                    </g>
                  )
                }),
              )}
              <CriticalPathConnections
                criticalPath={criticalPath}
                getModelPositions={getModelPositions}
              />
            </svg>
          )}
        </div>
        {tooltip && (
          <div
            className="fixed z-50 bg-white border rounded-lg p-2 shadow-lg pointer-events-none font-mono text-xs"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y + 10,
            }}
          >
            <p className="font-bold">{tooltip.record.model}</p>
            <p>Worker: {tooltip.record.worker}</p>
            <p>Duration: {tooltip.record.duration.toFixed(2)}s</p>
            <p>Start: {formatTime(tooltip.record.start)}</p>
            <p>End: {formatTime(tooltip.record.end)}</p>
          </div>
        )}
        {activityTooltip && (
          <div
            className="fixed z-50 bg-white border rounded-lg p-2 shadow-lg pointer-events-none font-mono text-xs"
            style={{
              left: activityTooltip.x + 10,
              top: activityTooltip.y + 10,
            }}
          >
            <p className="font-semibold">Active Workers: {activityTooltip.activeWorkers}</p>
            <p className="text-sm text-muted-foreground">Time: {formatTime(activityTooltip.time)}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

