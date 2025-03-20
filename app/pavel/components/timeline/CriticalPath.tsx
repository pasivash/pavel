import type React from "react"

interface CriticalPathProps {
  criticalPath: string[]
  getModelPositions: (
    modelName: string,
  ) => { left: { x: number; y: number }; right: { x: number; y: number }; center: { x: number; y: number } } | null
  generatePath: (start: { x: number; y: number }, end: { x: number; y: number }, isOutgoing: boolean) => string
}

export const CriticalPath: React.FC<CriticalPathProps> = ({ criticalPath, getModelPositions, generatePath }) => {
  return (
    <>
      {criticalPath.length > 1 &&
        criticalPath.slice(0, -1).map((source, index) => {
          const target = criticalPath[index + 1]
          const sourcePos = getModelPositions(source)
          const targetPos = getModelPositions(target)

          if (sourcePos && targetPos) {
            return (
              <path
                key={`critical-path-${source}-${target}`}
                d={generatePath(sourcePos.right, targetPos.left, true)}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="none"
                opacity={0.7}
                className="transition-opacity duration-200"
              />
            )
          }
          return null
        })}
    </>
  )
}

