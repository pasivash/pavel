"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { CreatorInfo } from "./creator-info"
import { toast } from "@/components/ui/use-toast"

const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30 MB
const ALLOWED_FILE_TYPES = [".json"]

interface FileUploadProps {
  onFilesUploaded: (recordsFile: File, linksFile: File) => void
  onUseSampleData: () => void
  isLoading: boolean
}

export function FileUpload({ onFilesUploaded, onUseSampleData, isLoading }: FileUploadProps) {
  const [runResultsFile, setRunResultsFile] = useState<File | null>(null)
  const [linksFile, setLinksFile] = useState<File | null>(null)
  const runResultsInputRef = useRef<HTMLInputElement>(null)
  const linksInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (runResultsFile && linksFile) {
      if (runResultsFile.type !== "application/json" || linksFile.type !== "application/json") {
        toast({
          title: "Invalid file type",
          description: "Both files must be valid JSON files.",
          variant: "destructive",
        })
        return
      }
      onFilesUploaded(runResultsFile, linksFile)
    }
  }

  const handleFileChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        // Check file type
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
        if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
          toast({
            title: "Invalid file type",
            description: `Please upload a JSON file. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
            variant: "destructive",
          })
          return
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
            variant: "destructive",
          })
          return
        }

        setter(file)
      }
    },
    [],
  )

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => () => {
    ref.current?.click()
  }

  const currentYear = new Date().getFullYear()

  const buttonClass = "w-full sm:w-48 h-10 text-white bg-black hover:bg-black/80 transition-colors duration-200"

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="runResults" className="flex items-center">
              Run Results JSON File
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <HelpCircle className="h-4 w-4 ml-2" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-white border p-4" style={{ maxWidth: "400px" }}>
                    <p className="mb-2">Expected format:</p>
                    <pre className="mt-2 bg-gray-200 p-2 rounded text-xs whitespace-pre">
                      {`[
{
  "worker": "Thread-1",
  "started_at": "${currentYear}-04-20T16:00:00Z",
  "completed_at": "${currentYear}-04-20T16:05:00Z",
  "model": "some.model.a"
},
...
]`}
                    </pre>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="flex items-center mt-2">
              <Input
                id="runResults"
                type="file"
                accept=".json"
                onChange={handleFileChange(setRunResultsFile)}
                required
                className="hidden"
                ref={runResultsInputRef}
              />
              <Button type="button" onClick={triggerFileInput(runResultsInputRef)} className={`${buttonClass}`}>
                Choose Run Results File
              </Button>
              {runResultsFile && (
                <div className="flex items-center flex-1 overflow-hidden ml-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{runResultsFile.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="links" className="flex items-center">
              Links JSON File
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <HelpCircle className="h-4 w-4 ml-2" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-white border p-4" style={{ maxWidth: "400px" }}>
                    <p className="mb-2">Expected format:</p>
                    <pre className="mt-2 bg-gray-200 p-2 rounded text-xs whitespace-pre">
                      {`[
{
  "source": "some.model.a",
  "target": "some.model.b"
},
...
]`}
                    </pre>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="flex items-center mt-2">
              <Input
                id="links"
                type="file"
                accept=".json"
                onChange={handleFileChange(setLinksFile)}
                required
                className="hidden"
                ref={linksInputRef}
              />
              <Button type="button" onClick={triggerFileInput(linksInputRef)} className={`${buttonClass}`}>
                Choose Links File
              </Button>
              {linksFile && (
                <div className="flex items-center flex-1 overflow-hidden ml-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{linksFile.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button
            type="submit"
            disabled={!runResultsFile || !linksFile || isLoading}
            className={`${buttonClass} disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
          >
            Upload and Visualize
          </Button>
          <span className="text-sm font-medium text-muted-foreground">or</span>
          <Button
            type="button"
            onClick={onUseSampleData}
            disabled={isLoading}
            className={`${buttonClass} disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
          >
            Use Sample Data
          </Button>
        </div>
      </form>
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-2">About This App</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This application visualizes data pipeline execution, showing model dependencies and execution times.</p>
            <p>Key features:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Interactive timeline of model executions</li>
              <li>Click on a model to see its parents and children (both on the chart and in the right pane)</li>
              <li>View the critical path as a list and highlighted on the chart</li>
              <li>Search for specific models</li>
              <li>Chart of active workers over time</li>
              <li>Detailed model information and dependencies</li>
            </ul>
            <p>Upload your run results and model links files or use sample data to explore the pipeline's execution.</p>
            <p>
              All computations, including data manipulations, critical path calculation, and rendering, are performed
              locally. No data is sent to external servers.
            </p>
          </div>
        </CardContent>
      </Card>
      <CreatorInfo />
    </div>
  )
}

