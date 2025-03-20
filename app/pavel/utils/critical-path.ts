import type { Record, Link } from "../types"

interface ModelNode {
  id: string
  duration: number
  earliestStart: number
  earliestFinish: number
  latestStart: number
  latestFinish: number
  parents: string[]
  children: string[]
}

interface Graph {
  [key: string]: ModelNode
}

interface CalculationState {
  stage: string
  progress: number
}

export async function calculateCriticalPath(
  records: Record[],
  links: Link[],
  onProgress: (stage: string, progress: number) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  console.log(`Calculating critical path for ${records.length} records and ${links.length} links`)

  function checkCancellation() {
    if (signal?.aborted) {
      throw new Error("Operation cancelled")
    }
  }

  try {
    // Create a Map of model durations for quick lookup
    const modelDurations = new Map(
      records.map((record) => [
        record.model,
        (new Date(record.completed_at).getTime() - new Date(record.started_at).getTime()) / 1000,
      ]),
    )

    // Build graph - O(V)
    onProgress("Building graph", 0)
    const graph: Graph = {}
    records.forEach((record) => {
      graph[record.model] = {
        id: record.model,
        duration: modelDurations.get(record.model) || 0,
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: 0,
        latestFinish: 0,
        parents: [],
        children: [],
      }
    })

    // Process dependencies - O(E)
    onProgress("Processing dependencies", 25)
    links.forEach((link) => {
      if (graph[link.source] && graph[link.target]) {
        graph[link.source].children.push(link.target)
        graph[link.target].parents.push(link.source)
      }
    })

    // Kahn's algorithm for topological sort with earliest times calculation - O(V + E)
    onProgress("Calculating times", 50)
    const sorted: string[] = []
    const noIncoming = Object.keys(graph).filter((node) => graph[node].parents.length === 0)
    const inDegree = new Map(Object.keys(graph).map((node) => [node, graph[node].parents.length]))

    // Calculate earliest times during topological sort
    while (noIncoming.length > 0) {
      checkCancellation()
      const current = noIncoming.shift()!
      sorted.push(current)

      const node = graph[current]
      node.earliestFinish = node.earliestStart + node.duration

      for (const childId of node.children) {
        const child = graph[childId]
        child.earliestStart = Math.max(child.earliestStart, node.earliestFinish)

        const newDegree = inDegree.get(childId)! - 1
        inDegree.set(childId, newDegree)
        if (newDegree === 0) {
          noIncoming.push(childId)
        }
      }
    }

    // Calculate latest times in reverse order - O(V + E)
    onProgress("Finalizing critical path", 75)
    const projectEnd = Math.max(...Object.values(graph).map((node) => node.earliestFinish))

    // Initialize latest times
    sorted.reverse().forEach((nodeId) => {
      const node = graph[nodeId]
      if (node.children.length === 0) {
        node.latestFinish = projectEnd
      } else {
        node.latestFinish = Math.min(...node.children.map((childId) => graph[childId].latestStart))
      }
      node.latestStart = node.latestFinish - node.duration
    })

    // Find critical path (nodes where earliest = latest) - O(V)
    const criticalPath: string[] = []
    let current = sorted.find(
      (nodeId) =>
        graph[nodeId].children.length === 0 &&
        Math.abs(graph[nodeId].earliestFinish - graph[nodeId].latestFinish) < 0.001,
    )

    while (current) {
      checkCancellation()
      criticalPath.unshift(current)

      // Find the critical parent (if any)
      current = graph[current].parents.find(
        (parentId) =>
          Math.abs(graph[parentId].earliestFinish - graph[parentId].latestFinish) < 0.001 &&
          Math.abs(graph[parentId].earliestFinish - graph[current!].earliestStart) < 0.001,
      )
    }

    onProgress("Finalizing critical path", 100)
    console.log(`Critical path calculation complete. Path length: ${criticalPath.length}`)
    return criticalPath
  } catch (error) {
    if (error instanceof Error && error.message === "Operation cancelled") {
      console.log("Critical path calculation cancelled")
      return []
    }
    console.error("Error during critical path calculation:", error)
    throw error
  }
}

