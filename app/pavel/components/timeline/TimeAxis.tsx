import type React from "react"
import { formatTime } from "@/app/utils/time-utils"

interface TimeAxisProps {
  timeAxisTicks: number[]
  timeToX: (time: number) => number
  DIMENSIONS: any
  isTop?: boolean
}

export const TimeAxis: React.FC<TimeAxisProps> = ({ timeAxisTicks, timeToX, DIMENSIONS, isTop = true }) => {
  return (
    <g className={`axis ${isTop ? "top-axis" : "bottom-axis"}`}>
      {timeAxisTicks.map((time, i) => (
        <g key={`${isTop ? "top" : "bottom"}-time-${i}`}>
          <line
            x1={timeToX(time)}
            y1={isTop ? DIMENSIONS.topPadding - 5 : DIMENSIONS.topPadding + DIMENSIONS.height}
            x2={timeToX(time)}
            y2={
              isTop ? DIMENSIONS.topPadding - 15 : DIMENSIONS.height + DIMENSIONS.topPadding + DIMENSIONS.bottomPadding
            }
            stroke={isTop ? "rgb(75, 85, 99)" : "rgb(229, 231, 235)"}
            strokeWidth="1"
            strokeDasharray={isTop ? "none" : "4 4"}
          />
          <text
            x={timeToX(time)}
            y={
              isTop
                ? DIMENSIONS.topPadding - 20
                : DIMENSIONS.height + DIMENSIONS.topPadding + 20 + DIMENSIONS.bottomPadding
            }
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
          >
            {formatTime(time)}
          </text>
        </g>
      ))}
    </g>
  )
}

