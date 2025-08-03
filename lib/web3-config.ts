// lib/web3-config.ts
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
      http: ['https://node.ghostnet.etherlink.com'],
    },
    public: {
      http: ['https://node.ghostnet.etherlink.com'],
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
    [etherlink.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// Contract Configuration
export const CONTRACT_CONFIG = {
  address: '0x7B80B5f84C84F2DfC4846938e8B1b3283d75453a' as `0x${string}`,
  chainId: etherlink.id,
  abi: [
    // We'll add the full ABI here once provided
    {
      "inputs": [{"internalType": "uint256", "name": "_characterTypeId", "type": "uint256"}],
      "name": "acquireCharacter",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "_characterInstanceId", "type": "uint256"}],
      "name": "initiateMatch",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    // Add more ABI functions as needed
  ] as const,
}