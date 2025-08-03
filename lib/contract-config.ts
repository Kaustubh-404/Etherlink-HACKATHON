// lib/contract-config.ts
import { type Address } from 'viem'

// Contract Address Configuration
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '128123')

// Validate required environment variables
if (!CONTRACT_ADDRESS) {
  throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is required')
}

// Complete Smart Contract ABI
export const BATTLE_ARENA_ABI = 
[
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_characterTypeId",
				"type": "uint256"
			}
		],
		"name": "acquireCharacter",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "characterInstanceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "characterTypeId",
				"type": "uint256"
			}
		],
		"name": "CharacterAcquired",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "characterInstanceId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newLevel",
				"type": "uint256"
			}
		],
		"name": "CharacterLeveledUp",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			}
		],
		"name": "claimTimeoutVictory",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			}
		],
		"name": "emergencyCancelMatch",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_characterInstanceId",
				"type": "uint256"
			}
		],
		"name": "initiateMatch",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_characterInstanceId",
				"type": "uint256"
			}
		],
		"name": "joinMatch",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_characterInstanceId",
				"type": "uint256"
			}
		],
		"name": "levelUpCharacter",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_abilityIndex",
				"type": "uint256"
			}
		],
		"name": "makeMove",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "matchId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "reward",
				"type": "uint256"
			}
		],
		"name": "MatchCompleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "matchId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "initiator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "stake",
				"type": "uint256"
			}
		],
		"name": "MatchInitiated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "matchId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "opponent",
				"type": "address"
			}
		],
		"name": "MatchJoined",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "matchId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "abilityIndex",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "damage",
				"type": "uint256"
			}
		],
		"name": "MoveMade",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "pause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Paused",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_feePercentage",
				"type": "uint256"
			}
		],
		"name": "setPlatformFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "unpause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Unpaused",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "withdrawPlatformFees",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "ABILITIES_PER_CHARACTER",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "characterInstances",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "characterTypeId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "level",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "experience",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "characterTypes",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "baseHealth",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "baseMana",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "baseDefense",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "findingMatches",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAllCharacterTypes",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_characterInstanceId",
				"type": "uint256"
			}
		],
		"name": "getCharacterInstance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "characterTypeId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "characterTypeName",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "level",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "health",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "mana",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "defense",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "experience",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_characterTypeId",
				"type": "uint256"
			}
		],
		"name": "getCharacterType",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "baseHealth",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "baseMana",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "baseDefense",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_characterTypeId",
				"type": "uint256"
			}
		],
		"name": "getCharacterTypeAbilities",
		"outputs": [
			{
				"internalType": "string[4]",
				"name": "names",
				"type": "string[4]"
			},
			{
				"internalType": "uint256[4]",
				"name": "baseDamages",
				"type": "uint256[4]"
			},
			{
				"internalType": "uint256[4]",
				"name": "manaCosts",
				"type": "uint256[4]"
			},
			{
				"internalType": "uint256[4]",
				"name": "cooldowns",
				"type": "uint256[4]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_stake",
				"type": "uint256"
			}
		],
		"name": "getFindingMatches",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			}
		],
		"name": "getMatch",
		"outputs": [
			{
				"internalType": "address",
				"name": "player1",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "player2",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "stake",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "currentTurn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"internalType": "enum BattleArena.MatchStatus",
				"name": "status",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "turnCount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "lastMoveTimestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			}
		],
		"name": "getMatchCharacters",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "char1InstanceId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "char1Health",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "char1Mana",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "char2InstanceId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "char2Health",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "char2Mana",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_player",
				"type": "address"
			}
		],
		"name": "getPlayerProfile",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "ownedCharacterInstances",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "totalMatches",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "wins",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "losses",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_matchId",
				"type": "uint256"
			}
		],
		"name": "getTimeLeftForCurrentTurn",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MANA_REGEN_PER_TURN",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "matches",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "matchId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "player1",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "player2",
				"type": "address"
			},
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "characterInstanceId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "currentHealth",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "currentMana",
						"type": "uint256"
					},
					{
						"internalType": "uint256[]",
						"name": "abilityCooldowns",
						"type": "uint256[]"
					}
				],
				"internalType": "struct BattleArena.CharacterInMatch",
				"name": "character1",
				"type": "tuple"
			},
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "characterInstanceId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "currentHealth",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "currentMana",
						"type": "uint256"
					},
					{
						"internalType": "uint256[]",
						"name": "abilityCooldowns",
						"type": "uint256[]"
					}
				],
				"internalType": "struct BattleArena.CharacterInMatch",
				"name": "character2",
				"type": "tuple"
			},
			{
				"internalType": "uint256",
				"name": "stake",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "currentTurn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"internalType": "enum BattleArena.MatchStatus",
				"name": "status",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "turnCount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "createdAt",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "lastMoveTimestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_LEVEL",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_TURN_TIME",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextCharacterInstanceId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextMatchId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "platformFeePercentage",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "playerProfiles",
		"outputs": [
			{
				"internalType": "address",
				"name": "playerAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "totalMatches",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "wins",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "losses",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TOTAL_CHARACTER_TYPES",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TURN_TIMEOUT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
 ] as const

// Character Type Mappings
export const CHARACTER_TYPES = {
  ZEUS: 1,
  ATHENA: 2,
  HADES: 3,
  NYX: 4
} as const

export const CHARACTER_TYPE_NAMES = {
  1: 'Zeus',
  2: 'Athena', 
  3: 'Hades',
  4: 'Nyx'
} as const

// Match Status Enum
export const MATCH_STATUS = {
  FINDING: 0,
  ONGOING: 1,
  COMPLETED: 2
} as const

// Game Constants
export const GAME_CONSTANTS = {
  MAX_LEVEL: 100,
  ABILITIES_PER_CHARACTER: 4,
  TURN_TIMEOUT: 30 * 60, // 30 minutes in seconds
  MANA_REGEN_PER_TURN: 15,
  TOTAL_CHARACTER_TYPES: 4
} as const