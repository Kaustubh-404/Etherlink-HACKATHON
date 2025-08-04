// app/layout.tsx
import type React from "react"
import "@/app/globals.css" // FIX: Use correct path
import { ThemeProvider } from "@/components/theme-provider"
import { GameContextProvider } from "@/components/game-context-provider"
import { Web3Provider } from "@/components/web3-provider"
import { ContractMultiplayerProvider } from "@/components/contract-multiplayer-provider"
import { ErrorBoundary } from "@/components/error-boundary"

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
        <ErrorBoundary>
          <Web3Provider>
            <ContractMultiplayerProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                <GameContextProvider>{children}</GameContextProvider>
              </ThemeProvider>
            </ContractMultiplayerProvider>
          </Web3Provider>
        </ErrorBoundary>
      </body>
    </html>
  )
}