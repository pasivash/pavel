import { LinkedinIcon, TwitterIcon, Mail, Send, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"

export function CreatorInfo() {
  return (
    <Card className="bg-white border-t">
      <CardContent className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-3 sm:space-y-0">
        <div className="text-sm text-muted-foreground">
          <span>Created by </span>
          <Link href="/" className="font-medium text-primary underline hover:text-primary/80">
            Pavel Sivash
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
            <Globe className="h-4 w-4" />
          </Link>
          <a
            href="https://www.linkedin.com/in/pasivash/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <LinkedinIcon className="h-4 w-4" />
          </a>
          <a
            href="https://x.com/pasivash"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <TwitterIcon className="h-4 w-4" />
          </a>
          <a
            href="https://t.me/psivash"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Send className="h-4 w-4" />
          </a>
          <a href="mailto:pasivash@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
            <Mail className="h-4 w-4" />
          </a>
        </div>

        <a
          href="https://www.buymeacoffee.com/pasivash"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-[#FFDD00] rounded-lg hover:bg-[#FFDD00]/90 focus:ring-4 focus:outline-none focus:ring-[#FFDD00]/50"
        >
          <Image
            src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            alt="Buy me a coffee"
            width={15}
            height={15}
            className="mr-2"
          />
          <span className="text-black">Buy me a coffee</span>
        </a>
      </CardContent>
    </Card>
  )
}

