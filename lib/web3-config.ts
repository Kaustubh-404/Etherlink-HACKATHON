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
      http: [
        process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com',
        'https://rpc.etherlink.com' // Fallback RPC to handle rate limiting
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL || 'https://node.ghostnet.etherlink.com',
        'https://rpc.etherlink.com' // Fallback RPC to handle rate limiting
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Etherlink Explorer', url: 'https://testnet-explorer.etherlink.com' },
  },
  testnet: true,
} as const

// Wagmi Configuration with retry and rate limiting
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
    [etherlink.id]: http(process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL, {
      batch: true,
      fetchOptions: {
        mode: 'cors',
      },
      retryCount: 3,
      retryDelay: ({ count, error }) => {
        // Exponential backoff with jitter for rate limiting
        if (error && error.message && error.message.includes('429')) {
          return Math.min(1000 * Math.pow(2, count) + Math.random() * 1000, 10000)
        }
        return 1000 * Math.pow(2, count)
      },
    }),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// Export chain for external use
export { etherlink as defaultChain }