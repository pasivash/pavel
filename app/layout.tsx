import { Source_Sans_3 as Source_Sans_Pro } from "next/font/google"
import "./pavel/globals.css"
import type React from "react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next"

const sourceSansPro = Source_Sans_Pro({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "900"],
})

export const metadata: Metadata = {
  title: "PAVEL - Pipeline Analytics & Visualization",
  description: "Pipeline Analytics & Visualization for Execution Logs",
  icons: {
    icon: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-16x16-PJOUNBAr9dyyYiJeaf0KPgI7DJDaXC.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-32x32-tSYFDUihjeCCJg84ZUaqXW650a3KdE.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/apple-touch-icon-imelsJjvjcUToeVI8YTfY6O2U92I5r.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/android-chrome-192x192-yqfEoACu7PXchf7cfJCCWbCsXV8iV1.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/android-chrome-512x512-lqeAVfJMF7y1fIw2a0N3pmnhL6oBLx.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={sourceSansPro.className}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}



import './globals.css'