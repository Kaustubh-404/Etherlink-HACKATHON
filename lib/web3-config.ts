// lib/web3-config.ts (Updated for Phase 2)
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Etherlink L2 Chain Configuration
export const etherlink = {
  id: 128123,
  name: 'Etherlink Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherlink Explorer', url: 'https://testnet-explorer.etherlink.com' },
  },
  testnet: true,
} as const

// Wagmi Configuration
export const config = createConfig({
  chains: [etherlink, sepolia, mainnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ 
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id' 
    }),
  ],
  transports: {
    [etherlink.id]: http(process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// Export chain for external use
export { etherlink as defaultChain }