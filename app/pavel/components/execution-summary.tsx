import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface ExecutionSummaryProps {
  totalDuration: number
  totalModels: number
  totalWorkers: number
}

export function ExecutionSummary({ totalDuration, totalModels, totalWorkers }: ExecutionSummaryProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Card className="bg-white h-9 rounded-md shadow-none">
        <CardContent className="p-0 flex items-center h-full overflow-hidden">
          <div className="flex space-x-4 px-3 select-none cursor-default">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium whitespace-nowrap">{formatDuration(totalDuration)}</div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-white">
                Total Duration
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium whitespace-nowrap">{totalModels} models</div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-white">
                Total Models
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium whitespace-nowrap">{totalWorkers} workers</div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-white">
                Unique Workers
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

