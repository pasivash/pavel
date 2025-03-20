import { Source_Sans_3 as Source_Sans_Pro } from "next/font/google"

const sourceSansPro = Source_Sans_Pro({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "900"],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={sourceSansPro.className}>{children}</body>
    </html>
  )
}

