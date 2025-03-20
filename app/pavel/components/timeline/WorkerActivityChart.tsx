import React, { useRef, useEffect, useMemo, useCallback } from "react"
import debounce from "lodash/debounce"

interface WorkerActivityChartProps {
  workerActivityData: { time: number; activeWorkers: number }[]
  timeRange: { start: number; end: number }
  timeToX: (time: number) => number
  workerActivityToY: (activeWorkers: number, isLabel?: boolean) => number
  DIMENSIONS: any
  selectedTimeRange: { start: number; end: number } | null
  maxActiveWorkers: number
  handleActivityMouseMove: (event: React.MouseEvent<SVGRectElement>) => void
}

export const WorkerActivityChart: React.FC<WorkerActivityChartProps> = React.memo(
  ({
    workerActivityData,
    timeRange,
    timeToX,
    workerActivityToY,
    DIMENSIONS,
    selectedTimeRange,
    maxActiveWorkers,
    handleActivityMouseMove,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const renderToCanvas = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const start = performance.now()

      // Set up canvas for high DPI displays
      const dpr = window.devicePixelRatio || 1
      canvas.width = (DIMENSIONS.width - DIMENSIONS.leftPadding - DIMENSIONS.rightPadding) * dpr
      canvas.height = DIMENSIONS.workerActivityHeight * dpr
      ctx.scale(dpr, dpr)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create path for worker activity
      ctx.beginPath()
      workerActivityData.forEach((d, i) => {
        const x = timeToX(d.time) - DIMENSIONS.leftPadding
        const y =
          workerActivityToY(d.activeWorkers) -
          (DIMENSIONS.topPadding - DIMENSIONS.workerActivityHeight - DIMENSIONS.workerActivityTopMargin - 30)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      // Draw normal path with lower opacity if there's a selection
      ctx.globalAlpha = selectedTimeRange ? 0.3 : 1
      ctx.strokeStyle = "hsl(var(--primary))"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw selected range with full opacity
      if (selectedTimeRange) {
        ctx.beginPath()
        let isFirst = true
        workerActivityData.forEach((d) => {
          if (d.time >= selectedTimeRange.start && d.time <= selectedTimeRange.end) {
            const x = timeToX(d.time) - DIMENSIONS.leftPadding
            const y =
              workerActivityToY(d.activeWorkers) -
              (DIMENSIONS.topPadding - DIMENSIONS.workerActivityHeight - DIMENSIONS.workerActivityTopMargin - 30)
            if (isFirst) {
              ctx.moveTo(x, y)
              isFirst = false
            } else {
              ctx.lineTo(x, y)
            }
          }
        })

        ctx.globalAlpha = 1
        ctx.strokeStyle = "hsl(var(--primary))"
        ctx.lineWidth = 3
        ctx.stroke()
      }

      const end = performance.now()
      console.log(`WorkerActivityChart render time: ${end - start}ms`)
    }, [workerActivityData, timeToX, workerActivityToY, selectedTimeRange, DIMENSIONS, timeRange])

    const debouncedRender = useMemo(() => debounce(renderToCanvas, 16), [renderToCanvas])

    useEffect(() => {
      debouncedRender()
      return () => {
        debouncedRender.cancel()
      }
    }, [debouncedRender])

    return (
      <g className="worker-activity-chart">
        <text
          x={DIMENSIONS.leftPadding - 40}
          y={DIMENSIONS.topPadding - DIMENSIONS.workerActivityHeight - DIMENSIONS.workerActivityTopMargin - 10}
          textAnchor="end"
          className="text-sm fill-foreground"
        >
          Active Workers
        </text>
        {[1, Math.floor(maxActiveWorkers / 2), maxActiveWorkers].map((tick) => (
          <text
            key={`worker-activity-tick-${tick}`}
            x={DIMENSIONS.leftPadding - 5}
            y={workerActivityToY(tick, true)}
            textAnchor="end"
            className="text-xs fill-muted-foreground"
          >
            {tick}
          </text>
        ))}
        <foreignObject
          x={DIMENSIONS.leftPadding}
          y={DIMENSIONS.topPadding - DIMENSIONS.workerActivityHeight - DIMENSIONS.workerActivityTopMargin - 30}
          width={DIMENSIONS.width - DIMENSIONS.leftPadding - DIMENSIONS.rightPadding}
          height={DIMENSIONS.workerActivityHeight}
        >
          <svg
            width={DIMENSIONS.width - DIMENSIONS.leftPadding - DIMENSIONS.rightPadding}
            height={DIMENSIONS.workerActivityHeight}
          >
            <path
              d={workerActivityData
                .map((d, i) => `${i === 0 ? "M" : "L"} ${timeToX(d.time)} ${workerActivityToY(d.activeWorkers)}`)
                .join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              opacity={selectedTimeRange ? "0.3" : "1"}
            />
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
          </svg>
        </foreignObject>
        <rect
          x={DIMENSIONS.leftPadding}
          y={DIMENSIONS.topPadding - DIMENSIONS.workerActivityHeight - DIMENSIONS.workerActivityTopMargin - 30}
          width={DIMENSIONS.width - DIMENSIONS.leftPadding - DIMENSIONS.rightPadding}
          height={DIMENSIONS.workerActivityHeight + 40}
          fill="transparent"
          onMouseMove={handleActivityMouseMove}
          style={{ cursor: "crosshair" }}
        />
      </g>
    )
  },
)

WorkerActivityChart.displayName = "WorkerActivityChart"

