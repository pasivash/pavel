import React, { useRef, useEffect, useCallback, useMemo } from "react"

interface ModelBarsProps {
  workerData: Map<string, ProcessedRecord[]>
  timeToX: (time: number) => number
  workerToY: (worker: string) => number
  getBarColor: (
    duration: number,
    model: string,
    isParent: boolean,
    isChild: boolean,
    isOnCriticalPath: boolean,
  ) => string
  DIMENSIONS: any
  selectedModel: string | null
  parentModels: string[]
  childModels: string[]
  criticalPath: string[]
  handleModelSelect: (model: string | null) => void
  setHoveredModel: React.Dispatch<React.SetStateAction<string | null>>
  setTooltip: (tooltip: { x: number; y: number; record: ProcessedRecord } | null) => void
  handleChartMouseLeave: () => void
  setActivityTooltip: React.Dispatch<React.SetStateAction<ActivityTooltip | null>>
  onPerformanceLog: (label: string, time: number) => void
}

interface ProcessedRecord {
  model: string
  start: number
  end: number
  duration: number
  worker: string
  started_at: string
  completed_at: string
}

interface ActivityTooltip {
  x: number
  y: number
  activeWorkers: number
  time: number
}

export const ModelBars: React.FC<ModelBarsProps> = React.memo(
  ({
    workerData,
    timeToX,
    workerToY,
    getBarColor,
    DIMENSIONS,
    selectedModel,
    parentModels,
    childModels,
    criticalPath,
    handleModelSelect,
    setHoveredModel,
    setTooltip,
    handleChartMouseLeave,
    setActivityTooltip,
    onPerformanceLog,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const interactionLayerRef = useRef<SVGRectElement>(null)
    const modelPositionsRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map())

    // Get all workers and ensure they're properly sorted
    const sortedWorkers = useMemo(() => {
      const workers = Array.from(workerData.keys())
      return workers.sort((a, b) => {
        // Extract numbers from worker IDs (e.g., "Thread-01" -> 1)
        const aNum = Number.parseInt(a.match(/\d+/)?.[0] || "0")
        const bNum = Number.parseInt(b.match(/\d+/)?.[0] || "0")
        return aNum - bNum
      })
    }, [workerData])

    console.log("Sorted workers:", sortedWorkers)

    const renderToCanvas = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const start = performance.now()

      // Set up canvas for high DPI displays
      const dpr = window.devicePixelRatio || 1
      canvas.width = DIMENSIONS.width * dpr
      canvas.height = DIMENSIONS.height * dpr
      ctx.scale(dpr, dpr)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Reset model positions map
      modelPositionsRef.current.clear()

      // Draw background grid lines for ALL workers, even if they have no data
      sortedWorkers.forEach((worker, i) => {
        const y = DIMENSIONS.topPadding + i * DIMENSIONS.rowHeight
        ctx.beginPath()
        ctx.strokeStyle = "rgb(229, 231, 235)"
        ctx.setLineDash([4, 4])
        ctx.moveTo(DIMENSIONS.leftPadding, y)
        ctx.lineTo(DIMENSIONS.width - DIMENSIONS.rightPadding, y)
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Batch render records
      sortedWorkers.forEach((worker) => {
        const records = workerData.get(worker) || []
        records.forEach((record) => {
          const x = timeToX(record.start)
          const y = workerToY(worker)
          const width = Math.max(timeToX(record.end) - x, 2)
          const height = DIMENSIONS.barHeight

          // Store position for hit testing
          modelPositionsRef.current.set(record.model, { x, y, width, height })

          // Set opacity based on selection state
          ctx.globalAlpha =
            selectedModel || criticalPath.length > 0
              ? record.model === selectedModel ||
                parentModels.includes(record.model) ||
                childModels.includes(record.model) ||
                criticalPath.includes(record.model)
                ? 1
                : 0.3
              : 1

          // Draw rounded rectangle
          ctx.beginPath()
          const radius = 4
          ctx.moveTo(x + radius, y)
          ctx.lineTo(x + width - radius, y)
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
          ctx.lineTo(x + width, y + height - radius)
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
          ctx.lineTo(x + radius, y + height)
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
          ctx.lineTo(x, y + radius)
          ctx.quadraticCurveTo(x, y, x + radius, y)
          ctx.closePath()

          // Fill with color
          ctx.fillStyle = getBarColor(
            record.duration,
            record.model,
            parentModels.includes(record.model),
            childModels.includes(record.model),
            criticalPath.includes(record.model),
          )
          ctx.fill()
        })
      })

      const end = performance.now()
      onPerformanceLog("ModelBars render", end - start)
    }, [
      DIMENSIONS,
      timeToX,
      workerToY,
      getBarColor,
      selectedModel,
      parentModels,
      childModels,
      criticalPath,
      onPerformanceLog,
      sortedWorkers,
      workerData,
    ])

    useEffect(() => {
      renderToCanvas()
    }, [renderToCanvas])

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGRectElement>) => {
        const rect = interactionLayerRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Find hovered model using stored positions
        let hoveredModel: string | null = null
        for (const [model, pos] of modelPositionsRef.current.entries()) {
          if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
            hoveredModel = model
            break
          }
        }

        if (hoveredModel) {
          const worker = sortedWorkers.find((w) => workerData.get(w)?.some((r) => r.model === hoveredModel))
          if (worker) {
            const record = workerData.get(worker)?.find((r) => r.model === hoveredModel)
            if (record) {
              setHoveredModel(hoveredModel)
              setTooltip({
                x: e.clientX,
                y: e.clientY,
                record,
              })
              return
            }
          }
        }

        setHoveredModel(null)
        setTooltip(null)
      },
      [setHoveredModel, setTooltip, sortedWorkers, workerData],
    )

    const handleClick = useCallback(
      (e: React.MouseEvent<SVGRectElement>) => {
        const rect = interactionLayerRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Find clicked model using stored positions
        for (const [model, pos] of modelPositionsRef.current.entries()) {
          if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
            handleModelSelect(model === selectedModel ? null : model)
            break
          }
        }
      },
      [handleModelSelect, selectedModel],
    )

    return (
      <g onMouseEnter={() => setActivityTooltip(null)} onMouseLeave={handleChartMouseLeave}>
        <foreignObject x={0} y={0} width={DIMENSIONS.width} height={DIMENSIONS.height}>
          <canvas
            ref={canvasRef}
            style={{
              width: DIMENSIONS.width,
              height: DIMENSIONS.height,
            }}
          />
        </foreignObject>
        <rect
          ref={interactionLayerRef}
          x={0}
          y={0}
          width={DIMENSIONS.width}
          height={DIMENSIONS.height}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        />
      </g>
    )
  },
)

ModelBars.displayName = "ModelBars"

