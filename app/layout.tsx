// app/layout.tsx
import type React from "react"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { GameContextProvider } from "@/components/game-context-provider"
import { Web3Provider } from "@/components/web3-provider"

export const metadata = {
  title: "Chrono Clash",
  description: "An epic blockchain-based battle game on Etherlink L2",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Web3Provider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <GameContextProvider>{children}</GameContextProvider>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  )
}