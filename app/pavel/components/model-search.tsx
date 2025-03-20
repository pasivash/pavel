"use client"

import { useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import type { Record } from "../types"

interface ModelSearchProps {
  records: Record[]
  onModelSelect: (model: string | null) => void
  selectedModel: string | null
}

export function ModelSearch({ records, onModelSelect, selectedModel }: ModelSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const allModels = Array.from(new Set(records.map((r) => r.model)))

  const filteredModels = allModels.filter((model) => {
    const normalizedModel = model.toLowerCase().replace(/_/g, " ")
    const normalizedSearchTerm = searchTerm.toLowerCase().replace(/_/g, " ")
    return normalizedModel.includes(normalizedSearchTerm)
  })

  const handleSelect = useCallback(
    (model: string) => {
      onModelSelect(model)
      setSearchTerm("")
    },
    [onModelSelect],
  )

  return (
    <div className="relative w-full">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder="Search models..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-8 pr-4 h-9 text-sm rounded-md"
      />
      {searchTerm && (
        <div className="absolute w-full mt-1 z-50">
          <Command className="border rounded-md shadow-md bg-white">
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              <CommandGroup>
                {filteredModels.map((model) => (
                  <CommandItem key={model} onSelect={() => handleSelect(model)}>
                    {model}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}

