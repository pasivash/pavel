import type React from "react"

interface CriticalPathConnectionsProps {
  criticalPath: string[]
  getModelPositions: (modelName: string) => { center: { x: number; y: number } } | null
}

export const CriticalPathConnections: React.FC<CriticalPathConnectionsProps> = ({
  criticalPath,
  getModelPositions,
}) => {
  return (
    <g className="critical-path-connections">
      {criticalPath.slice(0, -1).map((model, index) => {
        const currentModel = getModelPositions(model)
        const nextModel = getModelPositions(criticalPath[index + 1])

        if (currentModel && nextModel) {
          return (
            <line
              key={`critical-path-${index}`}
              x1={currentModel.center.x}
              y1={currentModel.center.y}
              x2={nextModel.center.x}
              y2={nextModel.center.y}
              stroke="hsl(210, 100%, 50%)" // Bright blue color
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )
        }
        return null
      })}
    </g>
  )
}

