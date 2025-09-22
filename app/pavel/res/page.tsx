"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Timeline } from "../components/timeline"
import { ModelDetails } from "../components/model-details"
import { ModelSearch } from "../components/model-search"
import { LoadingOverlay } from "../components/loading-overlay"
import { ExecutionSummary } from "../components/execution-summary"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import type { Record, Link } from "../types"
import { calculateCriticalPath } from "../utils/critical-path"
import { CriticalPathSummary } from "../components/critical-path-summary"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CreatorInfo } from "../components/creator-info"
import { useDataStore } from "../store"
import { useRouter, useSearchParams } from "next/navigation"

const calculateCriticalPathAsync = async (
  currentRecords: Record[],
  currentLinks: Link[],
  callbacks: {
    setIsCriticalPathCalculating: (value: boolean) => void
    setLoadingMessage: (message: string) => void
    setAbortController: (controller: AbortController | null) => void
    setCriticalPath: (path: string[]) => void
    toast: (params: { title: string; description: string; variant: string }) => void
  },
) => {
  if (currentRecords.length > 0 && currentLinks.length > 0) {
    try {
      callbacks.setIsCriticalPathCalculating(true)
      console.log("Starting critical path calculation...")
      callbacks.setLoadingMessage("Calculating critical path...")

      const controller = new AbortController()
      callbacks.setAbortController(controller)

      const path = await calculateCriticalPath(
        currentRecords,
        currentLinks,
        (stage, progress) => {
          callbacks.setLoadingMessage(`Calculating critical path: ${stage}`)
        },
        controller.signal,
      )

      if (path.length > 0) {
        console.log(
          `Critical path calculated. Length: ${path.length}, Start: ${path[0]}, End: ${path[path.length - 1]}`,
        )
        callbacks.setCriticalPath(path)
      } else {
        console.error("Critical path calculation returned an empty path")
        callbacks.setCriticalPath([])
      }
    } catch (error) {
      console.error("Error calculating critical path:", error)
      callbacks.toast({
        title: "Error calculating critical path",
        description:
          "An error occurred while calculating the critical path. Please check the console for more details.",
        variant: "destructive",
      })
      callbacks.setCriticalPath([])
    } finally {
      callbacks.setIsCriticalPathCalculating(false)
      callbacks.setAbortController(null)
    }
  }
}

export default function ResPage() {
  const { records, links, setData } = useDataStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const datasetId = searchParams.get("dataset")
  const datasetToken = searchParams.get("token")

  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: number; end: number } | null>(null)
  const [showCriticalPathOnChart, setShowCriticalPathOnChart] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>("Preparing your visualization...")
  const [isCriticalPathCalculating, setIsCriticalPathCalculating] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [criticalPath, setCriticalPath] = useState<string[]>([])
  const [isDatasetLoading, setIsDatasetLoading] = useState(false)
  const hasAttemptedDatasetLoadRef = useRef(false)
  const [dimensions, setDimensions] = useState({
    width: 900,
    minWidth: 900,
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
    const handleResize = () => {
      setDimensions((prev) => ({
        ...prev,
        width: Math.max(prev.minWidth, window.innerWidth - 400),
      }))
    }

    if (typeof window !== "undefined") {
      handleResize()
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [])

  useEffect(() => {
    if (
      !datasetId ||
      !datasetToken ||
      hasAttemptedDatasetLoadRef.current ||
      (records.length > 0 && links.length > 0)
    ) {
      return
    }

    const loadDataset = async () => {
      try {
        setIsDatasetLoading(true)
        setIsLoading(true)
        setLoadingMessage("Loading dataset...")

        const response = await fetch(
          `/api/datasets/${datasetId}?token=${encodeURIComponent(datasetToken)}`,
        )
        if (!response.ok) {
          throw new Error(`Failed to load dataset (status ${response.status}).`)
        }

        const data: { records: Record[]; links: Link[] } = await response.json()
        setData(data.records, data.links)
      } catch (error) {
        console.error("Failed to load dataset:", error)
        toast({
          title: "Unable to load dataset",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while loading the dataset.",
          variant: "destructive",
        })
        router.push("/pavel")
      } finally {
        hasAttemptedDatasetLoadRef.current = true
        setIsDatasetLoading(false)
        setIsLoading(false)
      }
    }

    void loadDataset()
  }, [datasetId, datasetToken, links.length, records.length, router, setData])

  useEffect(() => {
    if (
      records.length === 0 &&
      links.length === 0 &&
      (!datasetId || !datasetToken) &&
      !isDatasetLoading
    ) {
      router.push("/pavel")
    }
  }, [datasetId, datasetToken, isDatasetLoading, links.length, records.length, router])

  const { workers, timeRange, workerData, workerActivityData } = useMemo(() => {
    if (records.length === 0) {
      return {
        workers: [],
        timeRange: { start: 0, end: 0 },
        workerData: new Map(),
        workerActivityData: [],
      }
    }

    const processed = records.map((record) => ({
      model: record.model,
      worker: record.worker,
      started_at: record.started_at,
      completed_at: record.completed_at,
      start: new Date(record.started_at).getTime(),
      end: new Date(record.completed_at).getTime(),
      duration: (new Date(record.completed_at).getTime() - new Date(record.started_at).getTime()) / 1000,
    }))

    const workers = [...new Set(records.map((r) => r.worker))].sort((a, b) => {
      const aNum = Number.parseInt(a.match(/\d+/)?.[0] || "0")
      const bNum = Number.parseInt(b.match(/\d+/)?.[0] || "0")
      return aNum - bNum
    })

    const workerData = new Map<string, typeof processed>()
    workers.forEach((worker) => {
      workerData.set(worker, [])
    })

    processed.forEach((record) => {
      const workerRecords = workerData.get(record.worker) || []
      workerRecords.push(record)
      workerData.set(record.worker, workerRecords)
    })

    const allTimes = processed.flatMap((r) => [r.start, r.end])
    const timeRange = {
      start: Math.min(...allTimes),
      end: Math.max(...allTimes),
    }

    const periodDuration = 5000 // 5-second periods
    const periods = Math.ceil((timeRange.end - timeRange.start) / periodDuration)
    const workerActivityData = new Array(periods).fill(null).map((_, i) => {
      const periodStart = timeRange.start + i * periodDuration
      const periodEnd = periodStart + periodDuration
      const activeWorkers = new Set(
        processed.filter((r) => r.start < periodEnd && r.end > periodStart).map((r) => r.worker),
      ).size
      return {
        time: periodStart,
        activeWorkers,
      }
    })

    return { workers, timeRange, workerData, workerActivityData }
  }, [records])

  const executionSummary = useMemo(() => {
    const totalDuration = timeRange.end - timeRange.start
    const totalModels = records.length
    const totalWorkers = workers.length
    return { totalDuration, totalModels, totalWorkers }
  }, [timeRange, records, workers])

  useEffect(() => {
    if (records.length > 0 && links.length > 0) {
      calculateCriticalPathAsync(records, links, {
        setIsCriticalPathCalculating,
        setLoadingMessage,
        setAbortController,
        setCriticalPath,
        toast,
      })
    }
  }, [records, links])

  const handleCancelCalculation = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsCriticalPathCalculating(false)
      setCriticalPath([])
    }
  }, [abortController])

  const toggleCriticalPathOnChart = useCallback(() => {
    setShowCriticalPathOnChart((prev) => !prev)
  }, [])

  const handleModelSelect = useCallback(
    (model: string | null) => {
      setSelectedModel(model)
      if (model) {
        const selectedRecord = records.find((record) => record.model === model)
        if (selectedRecord) {
          setSelectedTimeRange({
            start: new Date(selectedRecord.started_at).getTime(),
            end: new Date(selectedRecord.completed_at).getTime(),
          })
        }
        // Scroll to the model details section only on mobile
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
          const modelDetailsElement = document.getElementById("model-details")
          if (modelDetailsElement) {
            modelDetailsElement.scrollIntoView({ behavior: "smooth" })
          }
        }
      } else {
        setSelectedTimeRange(null)
      }
    },
    [records],
  )

  return (
    <div className="mx-auto p-4 min-h-screen max-w-7xl lg:grid lg:grid-cols-[1fr,400px] lg:gap-4">
      <div className="lg:overflow-y-auto lg:max-h-[calc(100vh-2rem)]">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => router.push("/pavel")} className="h-8 w-8 rounded-md">
            <Home className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Pipeline Analytics & Visualization for Execution Logs</h1>
        </div>
        <TooltipProvider delayDuration={0}>
          <div className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex-grow flex items-center space-x-2 min-w-0">
                  <div className="flex-shrink-0">
                    <ExecutionSummary
                      totalDuration={executionSummary.totalDuration}
                      totalModels={executionSummary.totalModels}
                      totalWorkers={executionSummary.totalWorkers}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <ModelSearch records={records} onModelSelect={handleModelSelect} selectedModel={selectedModel} />
                  </div>
                </div>
              </div>

              {criticalPath.length > 0 && (
                <CriticalPathSummary criticalPath={criticalPath} records={records} onModelSelect={handleModelSelect} />
              )}

              <div className="flex flex-col gap-4">
                <div className="w-full overflow-x-auto">
                  <Timeline
                    records={records}
                    links={links}
                    selectedModel={selectedModel}
                    onModelSelect={handleModelSelect}
                    selectedTimeRange={selectedTimeRange}
                    criticalPath={showCriticalPathOnChart ? criticalPath : []}
                    showCriticalPathOnChart={showCriticalPathOnChart}
                    onToggleCriticalPath={toggleCriticalPathOnChart}
                    dimensions={dimensions}
                  />
                </div>
              </div>
            </div>
            <div className="mt-8">
              <CreatorInfo />
            </div>
          </div>
        </TooltipProvider>
      </div>
      <div id="model-details" className="w-full lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <ModelDetails model={selectedModel} records={records} links={links} onModelSelect={handleModelSelect} />
      </div>
      {(isLoading || isCriticalPathCalculating) && (
        <LoadingOverlay
          message={loadingMessage}
          onCancel={isCriticalPathCalculating ? handleCancelCalculation : undefined}
        />
      )}
    </div>
  )
}

