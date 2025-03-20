"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

interface SampleDataConfigProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (config: SampleDataConfig) => void
}

export interface SampleDataConfig {
  numWorkers: number
  numModels: number
  chaosLevel: number
}

export function SampleDataConfig({ isOpen, onClose, onGenerate }: SampleDataConfigProps) {
  const [numWorkers, setNumWorkers] = useState(10)
  const [numModels, setNumModels] = useState(50)
  const [chaosLevel, setChaosLevel] = useState(3)

  const handleGenerate = () => {
    onClose() // Close the dialog immediately
    onGenerate({
      numWorkers,
      numModels,
      chaosLevel,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Configure Sample Data</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="numWorkers" className="text-right">
              Workers
            </Label>
            <div className="col-span-3">
              <Slider
                id="numWorkers"
                min={1}
                max={100}
                step={1}
                value={[numWorkers]}
                onValueChange={(value) => setNumWorkers(value[0])}
                className="[&_[role=slider]]:bg-black [&_[role=slider]]:border-black [&_[role=slider]]:border-2 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_.range]:bg-black [&_[data-orientation=horizontal]]:h-2 [&_[data-orientation=horizontal]]:bg-gray-200"
              />
            </div>
            <div className="col-start-2 col-span-3 text-sm text-muted-foreground">{numWorkers}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="numModels" className="text-right">
              Models
            </Label>
            <div className="col-span-3">
              <Slider
                id="numModels"
                min={1}
                max={1500}
                step={1}
                value={[numModels]}
                onValueChange={(value) => setNumModels(value[0])}
                className="[&_[role=slider]]:bg-black [&_[role=slider]]:border-black [&_[role=slider]]:border-2 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_.range]:bg-black [&_[data-orientation=horizontal]]:h-2 [&_[data-orientation=horizontal]]:bg-gray-200"
              />
            </div>
            <div className="col-start-2 col-span-3 text-sm text-muted-foreground">{numModels}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="chaosLevel" className="text-right">
              Chaos
            </Label>
            <div className="col-span-3">
              <Slider
                id="chaosLevel"
                min={1}
                max={10}
                step={1}
                value={[chaosLevel]}
                onValueChange={(value) => setChaosLevel(value[0])}
                className="[&_[role=slider]]:bg-black [&_[role=slider]]:border-black [&_[role=slider]]:border-2 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_.range]:bg-black [&_[data-orientation=horizontal]]:h-2 [&_[data-orientation=horizontal]]:bg-gray-200"
              />
            </div>
            <div className="col-start-2 col-span-3 text-sm text-muted-foreground">{chaosLevel}</div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerate}
            className="w-full sm:w-auto h-10 text-white bg-black hover:bg-black/80 transition-colors duration-200"
          >
            Generate Sample Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

