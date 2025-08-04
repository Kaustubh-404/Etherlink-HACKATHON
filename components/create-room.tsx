// components/create-room.tsx - Phase 4: Enhanced with Contract Staking (FIXED)
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Copy, Users, RefreshCw, LogIn, Coins } from "lucide-react"
import { motion } from "framer-motion"
import { useMultiplayer } from "./multiplayer-context-provider"
import { useGameState } from "./game-state-provider"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"
import { playSound } from "@/lib/sound-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import TransactionStatus from "./transaction-status"
import GasEstimation from "./gas-estimation"
import { Web3Utils } from "@/lib/Web3-Utils"

interface CreateRoomProps {
  onBack: () => void
  onRoomCreated: (roomId: string) => void
}

export default function CreateRoom({ onBack, onRoomCreated }: CreateRoomProps) {
  const { 
    playerName, 
    setPlayerName, 
    createRoom, 
    isConnected, 
    isConnecting,
    connect, 
    currentRoom,
    connectionError: contextConnectionError,
    initiateContractMatch
  } = useMultiplayer()
  
  const { selectedCharacter, ownedCharacters } = useGameState()
  const { isConnected: contractConnected } = useContract()
  const { 
    address, 
    isWalletReady, 
    getFormattedBalance, 
    hasSufficientBalance 
  } = useWallet()
  
  const [name, setName] = useState(playerName)
  const [roomName, setRoomName] = useState("")
  const [stakeAmount, setStakeAmount] = useState("0.01")
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0)
  const [useStaking, setUseStaking] = useState(true)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [contractMatchId, setContractMatchId] = useState<number | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  
  // Phase 4: Contract integration state
  const [isInitiatingMatch, setIsInitiatingMatch] = useState(false)
  const [matchCreationStep, setMatchCreationStep] = useState<'setup' | 'creating' | 'initiated' | 'waiting'>('setup')
  
  // Function to ensure connection is established
  const ensureConnection = useCallback(async () => {
    if (!isConnected && !isConnecting) {
      try {
        setError(null);
        await connect();
        return true;
      } catch (err) {
        console.error("Failed to connect to multiplayer service:", err);
        setError("Failed to connect to multiplayer service. Please try again.");
        return false;
      }
    }
    return isConnected;
  }, [isConnected, isConnecting, connect]);

  // Make sure the connection is established on component mount
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      ensureConnection();
    }
  }, [isConnected, isConnecting, ensureConnection]);

  // Show connection error from context if available
  useEffect(() => {
    if (contextConnectionError && !error) {
      setError(contextConnectionError);
    }
  }, [contextConnectionError, error]);

  // Handle room creation success
  const handleRoomCreated = useCallback((event: Event) => {
    try {
      const e = event as CustomEvent;
      console.log("Room created successfully:", e.detail);
      
      if (!e.detail?.room?.id) {
        console.error("No room ID received in room_created event");
        setError("Failed to create room. No room ID received.");
        setCreating(false);
        return;
      }
      
      const roomId = e.detail.room.id;
      console.log(`Room created with ID: ${roomId}`);
      
      setCreating(false);
      setWaiting(true);
      setMatchCreationStep('waiting');
      
      // Proceed to the room with a short delay
      setTimeout(() => {
        onRoomCreated(roomId);
      }, 500);
    } catch (err) {
      console.error("Error handling room creation success:", err);
      setCreating(false);
      setError("An error occurred while processing the room creation response.");
    }
  }, [onRoomCreated]);

  // Handle room creation error
  const handleCreateError = useCallback((event: Event) => {
    try {
      const e = event as CustomEvent;
      console.error("Failed to create room:", e.detail);
      setCreating(false);
      setMatchCreationStep('setup');
      setError(e.detail?.error || "Failed to create room. Please try again.");
    } catch (err) {
      console.error("Error handling room creation error:", err);
      setCreating(false);
      setMatchCreationStep('setup');
      setError("An error occurred while processing the room creation error.");
    }
  }, []);

  // Listen for room creation success/failure events
  useEffect(() => {
    window.addEventListener("room_created", handleRoomCreated);
    window.addEventListener("create_room_error", handleCreateError as EventListener);

    // Set a timeout for error handling in case no event is received
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (creating) {
      timeoutId = setTimeout(() => {
        console.warn("Room creation timeout reached");
        setCreating(false);
        setMatchCreationStep('setup');
        
        // Increment attempt count
        setAttemptCount(prev => prev + 1);
        
        // After multiple attempts, suggest a different approach
        if (attemptCount >= 2) {
          setError(
            "Still having trouble creating a room. The server might be unavailable or there might be network issues."
          );
        } else {
          setError("Timed out while creating room. Please try again.");
        }
      }, 15000);
    }

    // Cleanup
    return () => {
      window.removeEventListener("room_created", handleRoomCreated);
      window.removeEventListener("create_room_error", handleCreateError as EventListener);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [creating, handleRoomCreated, handleCreateError, attemptCount]);

  // Monitor currentRoom changes to detect when a room is created
  useEffect(() => {
    if (currentRoom && creating) {
      console.log("Room created detected via currentRoom update:", currentRoom);
      
      // Validate room has ID
      if (!currentRoom.id) {
        console.error("Current room has no ID");
        setError("Room created but no valid ID received.");
        setCreating(false);
        setMatchCreationStep('setup');
        return;
      }
      
      setCreating(false);
      setWaiting(true);
      setMatchCreationStep('waiting');
      
      // Proceed to the room
      setTimeout(() => {
        onRoomCreated(currentRoom.id);
      }, 500);
    }
  }, [currentRoom, creating, onRoomCreated]);

  // Phase 4: Enhanced room creation with contract integration
  const handleCreateRoom = async () => {
    playSound("button-click.mp3");
    
    // Validate input
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    // Phase 4: Validate staking requirements
    if (useStaking) {
      if (!isWalletReady) {
        setError("Please connect your wallet to create a staked room");
        return;
      }

      if (!contractConnected) {
        setError("Contract not connected. Please refresh and try again.");
        return;
      }

      if (ownedCharacters.length === 0) {
        setError("You need to own a character to create a staked room");
        return;
      }

      // Validate stake amount
      const validation = Web3Utils.validateStakeAmount(stakeAmount);
      if (!validation.isValid) {
        setError(validation.error || "Invalid stake amount");
        return;
      }

      // Check sufficient balance
      if (!hasSufficientBalance(stakeAmount)) {
        setError(`Insufficient balance. You need at least ${stakeAmount} ETH plus gas fees.`);
        return;
      }
    }
    
    // Ensure we're connected to multiplayer service
    const connected = await ensureConnection();
    if (!connected) return;
    
    setCreating(true);
    setError(null);
    setMatchCreationStep('creating');
    
    // Update player name if changed
    if (name !== playerName) {
      setPlayerName(name);
    }
    
    try {
      console.log("Creating room with name:", roomName.trim() || `${name}'s Room`);
      
      // Phase 4: Handle contract match creation if staking is enabled
      if (useStaking && ownedCharacters.length > 0) {
        setIsInitiatingMatch(true);
        setMatchCreationStep('initiated');
        
        try {
          const selectedCharacter = ownedCharacters[selectedCharacterIndex];
          const matchId = await initiateContractMatch(selectedCharacter.id, stakeAmount);
          
          setContractMatchId(matchId);
          console.log("Contract match created with ID:", matchId);
          
          // Create room with contract match ID
          createRoom(roomName.trim() || `${name}'s Staked Room`, false, stakeAmount);
        } catch (contractError: any) {
          console.error("Failed to create contract match:", contractError);
          setError(`Failed to create staked match: ${contractError.message}`);
          setIsInitiatingMatch(false);
          setCreating(false);
          setMatchCreationStep('setup');
          return;
        }
        
        setIsInitiatingMatch(false);
      } else {
        // Create regular room without staking
        createRoom(roomName.trim() || `${name}'s Room`, false);
      }
    } catch (error: any) {
      console.error("Error in createRoom:", error);
      setError(error.message || "Failed to create room. Please try again.");
      setCreating(false);
      setMatchCreationStep('setup');
    }
  };

  const handleCopyRoomId = () => {
    if (!currentRoom?.id) return;
    
    playSound("button-click.mp3");
    navigator.clipboard.writeText(currentRoom.id);
    setCopied(true);
    
    // Reset the copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterRoom = () => {
    if (!currentRoom?.id) return;
    
    playSound("button-click.mp3");
    onRoomCreated(currentRoom.id);
  };

  const handleBack = () => {
    playSound("button-click.mp3");
    onBack();
  };

  const getStepTitle = () => {
    switch (matchCreationStep) {
      case 'creating': return 'Creating Room...'
      case 'initiated': return 'Setting up Staked Match...'
      case 'waiting': return 'Room Created!'
      default: return 'Create Staked Battle Room'
    }
  };

  const getStepDescription = () => {
    switch (matchCreationStep) {
      case 'creating': return 'Setting up multiplayer room'
      case 'initiated': return 'Initiating blockchain match with stake'
      case 'waiting': return 'Waiting for opponent to join'
      default: return 'Set up a multiplayer battle room with optional staking'
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage: `url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%2025%2C%202025%2C%2005_52_37%20PM-6IHp4UAeAu7379o8WR2JRyiAuYRvjo.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8"
      >
        <h1 className="text-4xl font-bold text-center text-yellow-400">{getStepTitle()}</h1>
        <p className="text-center text-gray-300 mt-2">{getStepDescription()}</p>
        {isConnecting && (
          <p className="text-center text-blue-400 mt-2">
            <RefreshCw className="inline-block mr-1 animate-spin" size={16} />
            Connecting to services...
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 bg-black/80 p-8 rounded-lg w-full max-w-md mb-8"
      >
        {(!currentRoom || !currentRoom.id) && matchCreationStep === 'setup' ? (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Your Display Name</label>
              <Input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your name"
                disabled={creating || isInitiatingMatch}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Room Name (Optional)</label>
              <Input 
                type="text" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter room name or leave blank for default"
                disabled={creating || isInitiatingMatch}
              />
            </div>

            {/* Phase 4: Staking Configuration */}
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-200">Enable Staking</label>
                <input
                  type="checkbox"
                  checked={useStaking}
                  onChange={(e) => setUseStaking(e.target.checked)}
                  className="rounded"
                  disabled={creating || isInitiatingMatch}
                />
              </div>

              {useStaking && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-200">Stake Amount (ETH)</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white pr-12"
                        placeholder="0.01"
                        min="0.001"
                        max="10"
                        step="0.001"
                        disabled={creating || isInitiatingMatch}
                      />
                      <Coins className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400" />
                    </div>
                  </div>

                  {ownedCharacters.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-200">Select Character</label>
                      <select
                        value={selectedCharacterIndex}
                        onChange={(e) => setSelectedCharacterIndex(Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                        disabled={creating || isInitiatingMatch}
                      >
                        {ownedCharacters.map((character, index) => (
                          <option key={character.id} value={index}>
                            {character.characterTypeName} (Level {character.level})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {address && (
                    <div className="bg-gray-900/50 rounded-lg p-3 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Wallet Balance:</span>
                        <span className="text-green-400">{getFormattedBalance()} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Required Stake:</span>
                        <span className="text-yellow-400">{stakeAmount} ETH</span>
                      </div>
                    </div>
                  )}

                  {/* Gas Estimation for staked rooms */}
                  {useStaking && address && ownedCharacters.length > 0 && (
                    <GasEstimation
                      functionName="initiateMatch"
                      args={[BigInt(ownedCharacters[selectedCharacterIndex]?.id || 0)]}
                      value={Web3Utils.parseEth(stakeAmount)}
                      showDetails={false}
                    />
                  )}
                </>
              )}
            </div>
            
            <Button
              onClick={handleCreateRoom}
              disabled={!name.trim() || creating || isInitiatingMatch || isConnecting || (useStaking && !isWalletReady)}
              className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-black font-bold py-3"
            >
              {creating || isInitiatingMatch ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-black border-r-transparent border-b-transparent border-l-transparent animate-spin mr-2"></div>
                  {isInitiatingMatch ? "Creating Staked Match..." : "Creating Room..."}
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  {useStaking ? `Create Staked Room (${stakeAmount} ETH)` : "Create Free Room"}
                </>
              )}
            </Button>
          </div>
        ) : matchCreationStep !== 'setup' ? (
          // Transaction status during creation
          <div className="space-y-6 text-center">
            <TransactionStatus
              isLoading={creating || isInitiatingMatch}
              error={error}
              hash={transactionHash}
              title={isInitiatingMatch ? "Creating Staked Match" : "Creating Room"}
              description={
                isInitiatingMatch 
                  ? "Setting up blockchain match with stake..." 
                  : "Creating multiplayer room..."
              }
            />

            {contractMatchId && (
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                <h3 className="font-bold text-green-400 mb-2">Contract Match Created!</h3>
                <p className="text-sm text-gray-300">Match ID: {contractMatchId}</p>
                <p className="text-sm text-gray-300">Stake: {stakeAmount} ETH</p>
              </div>
            )}
          </div>
        ) : (
          // Room created successfully
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full mx-auto flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-1">
                {useStaking ? "Staked Room Created!" : "Room Created!"}
              </h2>
              <p className="text-gray-300">Share this code with your opponent:</p>
            </div>
            
            <div className="relative">
              <div className="flex items-center bg-gray-800 rounded-lg p-4 border border-yellow-600">
                <div className="text-2xl font-mono font-bold text-yellow-400 tracking-widest mx-auto">
                  {currentRoom?.id || "ERROR"}
                </div>
              </div>
              <Button
                onClick={handleCopyRoomId}
                className="absolute right-1 top-1 h-10 w-10 p-0 bg-gray-700 hover:bg-gray-600"
                title="Copy room code"
              >
                {copied ? (
                  <span className="text-green-400 text-xs">Copied!</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {useStaking && contractMatchId && (
              <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-4">
                <div className="text-center">
                  <Coins className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <h3 className="font-bold text-purple-300 mb-1">Staked Match</h3>
                  <p className="text-sm text-gray-300">Stake: {stakeAmount} ETH</p>
                  <p className="text-xs text-gray-400">Winner takes all (minus platform fee)</p>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleEnterRoom}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Enter Room
            </Button>
            
            {waiting && (
              <div className="bg-gray-800/80 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <RefreshCw className="h-5 w-5 text-yellow-400 animate-spin mr-2" />
                  <span className="text-yellow-400">Waiting for opponent...</span>
                </div>
                <p className="text-sm text-gray-400">
                  {useStaking 
                    ? "The staked battle will start automatically when someone joins"
                    : "The battle will start automatically when someone joins"
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {!waiting && matchCreationStep === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            onClick={handleBack}
            className="bg-gray-800/90 hover:bg-gray-700/90 text-white px-6 py-2 rounded-full"
            disabled={creating || isInitiatingMatch}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
        </motion.div>
      )}
    </div>
  )
}