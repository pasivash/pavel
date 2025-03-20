"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileUpload } from "./components/file-upload"
import { SampleDataConfig } from "./components/sample-data-config"
import { LoadingOverlay } from "./components/loading-overlay"
import { toast } from "@/components/ui/use-toast"
import type { Record, Link } from "./types"
import { useDataStore } from "./store"

export default function Page() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>("Preparing your visualization...")
  const [isSampleDataConfigOpen, setIsSampleDataConfigOpen] = useState(false)
  const router = useRouter()
  const setData = useDataStore((state) => state.setData)

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)

    // Add event listener for route changes
    const handleRouteChange = () => {
      window.scrollTo(0, 0)
    }

    window.addEventListener("routeChangeComplete", handleRouteChange)

    // Cleanup
    return () => {
      window.removeEventListener("routeChangeComplete", handleRouteChange)
    }
  }, [])

  const handleFilesUploaded = async (runResultsFile: File, linksFile: File) => {
    try {
      setIsLoading(true)
      console.log("Handling file upload...")

      const [runResultsText, linksText] = await Promise.all([runResultsFile.text(), linksFile.text()])

      console.log(`Run Results file size: ${runResultsText.length} characters`)
      console.log(`Links file size: ${linksText.length} characters`)

      let parsedRecords: Record[]
      let parsedLinks: Link[]

      try {
        parsedRecords = JSON.parse(runResultsText)
        parsedLinks = JSON.parse(linksText)
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError)
        throw new Error("Failed to parse JSON. Please ensure your files contain valid JSON data.")
      }

      // Validate records
      if (
        !Array.isArray(parsedRecords) ||
        parsedRecords.some(
          (record) =>
            typeof record.worker !== "string" ||
            typeof record.started_at !== "string" ||
            typeof record.completed_at !== "string" ||
            typeof record.model !== "string",
        )
      ) {
        console.error("Invalid run results format")
        throw new Error("Invalid run results format. Please check your run results file.")
      }

      // Validate links
      if (
        !Array.isArray(parsedLinks) ||
        parsedLinks.some((link) => typeof link.source !== "string" || typeof link.target !== "string")
      ) {
        console.error("Invalid links format")
        throw new Error("Invalid links format. Please check your links file.")
      }

      console.log(`Parsed ${parsedRecords.length} records and ${parsedLinks.length} links`)

      setData(parsedRecords, parsedLinks)

      toast({
        title: "Files uploaded successfully",
        description: `Loaded ${parsedRecords.length} run results and ${parsedLinks.length} links`,
        variant: "success",
      })

      // Navigate to the results page
      router.push("/pavel/res")
    } catch (error) {
      console.error("Error in handleFilesUploaded:", error)
      toast({
        title: "Error uploading files",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseSampleData = async (config: SampleDataConfig) => {
    setIsLoading(true)
    setLoadingMessage("Generating sample data...")
    setIsSampleDataConfigOpen(false)

    // Use setTimeout to ensure the loading screen is rendered before starting the heavy computation
    setTimeout(async () => {
      try {
        const { records: sampleRecords, links: sampleLinks } = await generateSampleData(config)
        setData(sampleRecords, sampleLinks)
        toast({
          title: "Sample data loaded",
          description: `Generated ${sampleRecords.length} records with ${config.numWorkers} workers`,
          variant: "success",
        })
        // Navigate to the results page
        router.push("/pavel/res")
      } catch (error) {
        console.error("Error generating sample data:", error)
        toast({
          title: "Error generating sample data",
          description: "An error occurred while generating sample data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }, 0)
  }

  return (
    <div className="mx-auto p-4 min-h-screen max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Pipeline Analytics & Visualization for Execution Logs</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <FileUpload
          onFilesUploaded={handleFilesUploaded}
          onUseSampleData={() => setIsSampleDataConfigOpen(true)}
          isLoading={isLoading}
        />
      </div>

      {isLoading && <LoadingOverlay message={loadingMessage} />}

      <SampleDataConfig
        isOpen={isSampleDataConfigOpen}
        onClose={() => setIsSampleDataConfigOpen(false)}
        onGenerate={handleUseSampleData}
      />
    </div>
  )
}

// Helper function to generate sample data
async function generateSampleData(config: SampleDataConfig): Promise<{ records: Record[]; links: Link[] }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Generating sample data with config:", config)

      const { numWorkers, numModels, chaosLevel = 1 } = config
      const now = new Date()
      const totalModels = numModels
      const sourceCount = Math.floor(totalModels * 0.3) // 30% of models are sources
      const modelCount = totalModels - sourceCount
      const workerCount = numWorkers
      const maxDuration = Math.min(7200000, 600000 * chaosLevel) // Max 2 hours, scales with chaos
      const minDuration = 1000 // 1 second in milliseconds
      const maxParents = Math.min(50, Math.floor(5 * chaosLevel)) // Max 50 parents, scales with chaos

      // Helper function to generate duration using exponential distribution
      const generateDuration = () => {
        const lambda = 1 / (10 * 60 * 1000 * (chaosLevel / 5)) // Mean duration scales with chaos
        const x = Math.random()
        const duration = Math.round(-Math.log(1 - x) / lambda)
        return Math.min(Math.max(duration, minDuration), maxDuration)
      }

      interface Model {
        id: string
        worker: string | null
        startTime: number | null
        endTime: number | null
        duration: number
        parents: string[]
        children: string[]
      }

      // Generate source models
      const sourceModels: Model[] = Array.from({ length: sourceCount }, (_, i) => ({
        id: `source.sample.${i + 1}`,
        worker: null,
        startTime: null,
        endTime: null,
        duration: generateDuration(),
        parents: [],
        children: [],
      }))

      // Generate regular models
      const regularModels: Model[] = Array.from({ length: modelCount }, (_, i) => ({
        id: `model.sample.${i + 1}`,
        worker: null,
        startTime: null,
        endTime: null,
        duration: generateDuration(),
        parents: [],
        children: [],
      }))

      const allModels = [...sourceModels, ...regularModels]

      // Generate links
      const links: Link[] = []
      regularModels.forEach((model) => {
        const parentCount = Math.floor(Math.random() * maxParents) + 1 // 1 to maxParents parents
        const potentialParents = [...sourceModels, ...regularModels.filter((m) => m.id !== model.id)]

        for (let i = 0; i < parentCount; i++) {
          if (potentialParents.length === 0) break

          const parentIndex = Math.floor(Math.random() * potentialParents.length)
          const parent = potentialParents[parentIndex]

          if (!model.parents.includes(parent.id) && !hasLoop(parent, model.id, allModels)) {
            model.parents.push(parent.id)
            parent.children.push(model.id)
            links.push({ source: parent.id, target: model.id })
            potentialParents.splice(parentIndex, 1)
          }
        }
      })

      // Initialize workers
      const workers = Array.from({ length: workerCount }, (_, i) => ({
        id: `Thread-${String(i + 1).padStart(2, "0")}`,
        nextAvailableTime: 0,
      }))

      // Queue for models ready to be processed
      const readyModels: Model[] = [...sourceModels]
      const processedModels: Set<string> = new Set()

      // Process models
      while (readyModels.length > 0) {
        // Sort ready models by their parents' end times (if any)
        readyModels.sort((a, b) => {
          const aParentEndTime = Math.max(
            0,
            ...a.parents.map((parentId) => allModels.find((m) => m.id === parentId)?.endTime || 0),
          )
          const bParentEndTime = Math.max(
            0,
            ...b.parents.map((parentId) => allModels.find((m) => m.id === parentId)?.endTime || 0),
          )
          return aParentEndTime - bParentEndTime
        })

        const model = readyModels.shift()!

        // Find the earliest available worker
        workers.sort((a, b) => a.nextAvailableTime - b.nextAvailableTime)
        const worker = workers[0]

        // Calculate start time (max of worker's next available time and latest parent end time)
        const parentEndTime = Math.max(
          0,
          ...model.parents.map((parentId) => allModels.find((m) => m.id === parentId)?.endTime || 0),
        )
        const startTime = Math.max(worker.nextAvailableTime, parentEndTime)

        // Assign times and worker
        model.worker = worker.id
        model.startTime = startTime
        model.endTime = startTime + model.duration
        worker.nextAvailableTime = model.endTime

        processedModels.add(model.id)

        // Add children to ready queue if all their parents are processed
        allModels.forEach((potentialChild) => {
          if (
            !processedModels.has(potentialChild.id) &&
            !readyModels.includes(potentialChild) &&
            potentialChild.parents.every((parentId) => processedModels.has(parentId))
          ) {
            readyModels.push(potentialChild)
          }
        })

        // If no models are ready, add an unprocessed source model if available
        if (readyModels.length === 0) {
          const unprocessedSource = sourceModels.find((m) => !processedModels.has(m.id))
          if (unprocessedSource) {
            readyModels.push(unprocessedSource)
          }
        }
      }

      // Normalize times to fit within the total duration
      const minStartTime = Math.min(...allModels.map((model) => model.startTime!))
      allModels.forEach((model) => {
        model.startTime = model.startTime! - minStartTime
        model.endTime = model.endTime! - minStartTime
      })

      // Convert model data to records
      const records: Record[] = allModels.map((model) => ({
        worker: model.worker!,
        started_at: new Date(now.getTime() + model.startTime!).toISOString(),
        completed_at: new Date(now.getTime() + model.endTime!).toISOString(),
        model: model.id,
      }))

      console.log(`Generated ${records.length} records and ${links.length} links`)

      resolve({ records, links })
    }, 0)
  })
}

// Helper function to check for loops in the dependency graph
function hasLoop(model: any, targetId: string, allModels: any[], visited: Set<string> = new Set()): boolean {
  if (model.id === targetId) return true
  if (visited.has(model.id)) return false
  visited.add(model.id)
  return model.parents.some((parentId: string) => {
    const parentModel = allModels.find((m) => m.id === parentId)
    return parentModel ? hasLoop(parentModel, targetId, allModels, visited) : false
  })
}

