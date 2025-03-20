import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoadingOverlayProps {
  message: string
  onCancel?: () => void
}

export function LoadingOverlay({ message, onCancel }: LoadingOverlayProps) {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    // Force a re-render to ensure the overlay is visible
    forceUpdate({})
  }, [])

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md w-full px-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-lg font-semibold text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">This might take a while, don't close the page</p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

