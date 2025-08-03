// components/web3-provider.tsx
"use client"

import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, walletConnectWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets'
import { config } from '@/lib/web3-config'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, walletConnectWallet, injectedWallet],
    },
  ],
  {
    appName: 'Chrono Clash',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  }
)

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}