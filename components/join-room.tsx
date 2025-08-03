// components/join-room.tsx - Phase 4: Enhanced with Contract Staking
"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Copy, Users, RefreshCw, LogIn, Search, Coins, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import { useMultiplayer } from "./multiplayer-context-provider"
import { useGameState } from "./game-state-provider"
import { useContract } from "@/hooks/use-contract"
import { useWallet } from "@/hooks/use-wallet"
import { playSound } from "@/lib/sound-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import TransactionStatus from "./transaction-status"
import GasEstimation from "./gas-estimation"
import { Web3Utils } from "@/lib/Web3-Utils"

interface JoinRoomProps {
  onBack: () => void
  onRoomJoined: (roomId: string) => void
}

export default function JoinRoom({ onBack, onRoomJoined }: JoinRoomProps) {
  const { 
    playerName, 
    setPlayerName, 
    availableRooms, 
    joinRoom, 
    isConnected, 
    isConnecting,
    connect, 
    currentRoom, 
    connectionError: contextConnectionError,
    joinContractMatch
  } = useMultiplayer()
  
  const { ownedCharacters } = useGameState()
  const { 
    getFindingMatches, 
    getMatch, 
    isConnected: contractConnected 
  } = useContract()
  const { 
    address, 
    isWalletReady, 
    getFormattedBalance, 
    hasSufficientBalance 
  } = useWallet()
  
  const [name, setName] = useState(playerName)
  const [roomCode, setRoomCode] = useState("")
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewingRooms, setViewingRooms] = useState(false)
  const [refreshingRooms, setRefreshingRooms] = useState(false)
  
  // Phase 4: Contract integration state
  const [availableMatches, setAvailableMatches] = useState<{id: number, stake: string, host: string}[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [joiningContractMatch, setJoiningContractMatch] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  // Reset errors when the room code changes
  useEffect(() => {
    setError(null)
  }, [roomCode])

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

  // Phase 4: Load available contract matches
  const loadAvailableMatches = useCallback(async () => {
    if (!contractConnected || !address) return;

    setLoadingMatches(true);
    try {
      // Get matches for different stake amounts
      const stakeAmounts = ['0.01', '0.05', '0.1', '0.5'];
      const allMatches: {id: number, stake: string, host: string}[] = [];

      for (const stake of stakeAmounts) {
        try {
          const matchIds = await getFindingMatches(stake);
          
          for (const matchId of matchIds) {
            try {
              const match = await getMatch(matchId);
              if (match.status === 0 && match.player1 !== address) { // Finding status and not own match
                allMatches.push({
                  id: matchId,
                  stake,
                  host: match.player1
                });
              }
            } catch (matchError) {
              console.error(`Error loading match ${matchId}:`, matchError);
            }
          }
        } catch (stakeError) {
          console.error(`Error loading matches for stake ${stake}:`, stakeError);
        }
      }

      setAvailableMatches(allMatches);
    } catch (error) {
      console.error('Error loading available matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  }, [contractConnected, address, getFindingMatches, getMatch]);

  // Load available matches when viewing rooms
  useEffect(() => {
    if (viewingRooms && contractConnected) {
      loadAvailableMatches();
    }
  }, [viewingRooms, contractConnected, loadAvailableMatches]);

  // Set up event listeners for room joining success/failure
  useEffect(() => {
    const handleJoinSuccess = (e: Event) => {
      console.log("Room join success event received");
      setJoining(false);
      setJoiningContractMatch(false);
      
      // If we get to this point, the room should be updated in the context
      if (currentRoom && currentRoom.id) {
        onRoomJoined(currentRoom.id);
      } else {
        // Wait a short moment for the context to update
        setTimeout(() => {
          if (currentRoom && currentRoom.id) {
            onRoomJoined(currentRoom.id);
          } else {
            setError("Failed to get room data after joining");
          }
        }, 300);
      }
    };

    const handleJoinError = (e: CustomEvent) => {
      console.log("Room join error event received:", e.detail);
      setJoining(false);
      setJoiningContractMatch(false);
      setError(e.detail?.error || "Failed to join room");
    };

    // Add event listeners
    window.addEventListener("room_joined", handleJoinSuccess);
    window.addEventListener("join_room_error", handleJoinError as EventListener);

    // Set a timeout for error handling in case no event is received
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (joining) {
      timeoutId = setTimeout(() => {
        console.warn("Room join timeout reached");
        setJoining(false);
        setJoiningContractMatch(false);
        setError("Timed out waiting for server response. Please try again.");
      }, 15000);
    }

    // Cleanup
    return () => {
      window.removeEventListener("room_joined", handleJoinSuccess);
      window.removeEventListener("join_room_error", handleJoinError as EventListener);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [joining, onRoomJoined, currentRoom]);

  // Watch for room changes to detect joining
  useEffect(() => {
    if (currentRoom && joining) {
      setJoining(false);
      setJoiningContractMatch(false);
      // Make sure we have a valid room ID before proceeding
      if (currentRoom.id) {
        onRoomJoined(currentRoom.id);
      } else {
        setError("Room joined but no valid room ID found");
      }
    }
  }, [currentRoom, joining, onRoomJoined]);

  const handleRefreshRooms = async () => {
    try {
      setRefreshingRooms(true);
      
      // Reconnect to refresh the room list
      if (!isConnected) {
        await ensureConnection();
      }
      
      // Refresh contract matches
      if (contractConnected) {
        await loadAvailableMatches();
      }
      
      playSound("button-click.mp3");
      
      // Simulate delay for UX feedback
      setTimeout(() => {
        setRefreshingRooms(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to refresh rooms:", error);
      setRefreshingRooms(false);
    }
  };

  const handleJoinRoom = async () => {
    playSound("button-click.mp3");
    
    // Validate input
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    // Ensure we're connected
    const connected = await ensureConnection();
    if (!connected) return;
    
    // Update player name if changed
    if (name !== playerName) {
      setPlayerName(name);
    }
    
    setJoining(true);
    setError(null);
    
    console.log("Attempting to join room:", roomCode.trim());
    
    // Attempt to join the room
    joinRoom(roomCode.trim());
  };

  // Phase 4: Join contract match
  const handleJoinContractMatch = async (matchId: number, stakeAmount: string) => {
    playSound("button-click.mp3");
    
    // Validate requirements
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!isWalletReady) {
      setError("Please connect your wallet to join staked matches");
      return;
    }

    if (!contractConnected) {
      setError("Contract not connected. Please refresh and try again.");
      return;
    }

    if (ownedCharacters.length === 0) {
      setError("You need to own a character to join staked matches");
      return;
    }

    // Check sufficient balance
    if (!hasSufficientBalance(stakeAmount)) {
      setError(`Insufficient balance. You need at least ${stakeAmount} ETH plus gas fees.`);
      return;
    }
    
    // Ensure we're connected to multiplayer service
    const connected = await ensureConnection();
    if (!connected) return;
    
    // Update player name if changed
    if (name !== playerName) {
      setPlayerName(name);
    }
    
    setJoining(true);
    setJoiningContractMatch(true);
    setError(null);
    setTransactionHash(null);
    
    try {
      console.log("Joining contract match:", matchId);
      
      const selectedCharacter = ownedCharacters[selectedCharacterIndex];
      
      // Join the contract match
      const hash = await joinContractMatch(matchId, selectedCharacter.id, stakeAmount);
      setTransactionHash(hash);
      
      // Create/join the corresponding room
      // This would typically be handled by the contract event system
      // For now, we'll simulate joining a room
      setTimeout(() => {
        setJoining(false);
        setJoiningContractMatch(false);
        // Navigate to the battle room
        onRoomJoined(`MATCH_${matchId}`);
      }, 3000);
      
    } catch (contractError: any) {
      console.error("Failed to join contract match:", contractError);
      setError(`Failed to join staked match: ${contractError.message}`);
      setJoining(false);
      setJoiningContractMatch(false);
      setTransactionHash(null);
    }
  };

  const handleJoinSpecificRoom = async (roomId: string) => {
    playSound("button-click.mp3");
    
    // Validate input
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    
    // Ensure we're connected
    const connected = await ensureConnection();
    if (!connected) return;
    
    // Update player name if changed
    if (name !== playerName) {
      setPlayerName(name);
    }
    
    setJoining(true);
    setError(null);
    setRoomCode(roomId);
    
    console.log("Attempting to join specific room:", roomId);
    
    // Attempt to join the room
    joinRoom(roomId);
  };

  const handleBack = () => {
    playSound("button-click.mp3");
    onBack();
  };

  const toggleViewRooms = () => {
    playSound("button-click.mp3");
    setViewingRooms(!viewingRooms);
    if (!viewingRooms) {
      handleRefreshRooms();
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
        <h1 className="text-4xl font-bold text-center text-yellow-400">Join Battle</h1>
        <p className="text-center text-gray-300 mt-2">Enter a room code or join available staked matches</p>
        {isConnecting && (
          <p className="text-center text-blue-400 mt-2">
            <RefreshCw className="inline-block mr-1 animate-spin" size={16} />
            Connecting to multiplayer service...
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 bg-black/80 p-8 rounded-lg w-full max-w-md mb-8"
      >
        {!joining ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Your Display Name</label>
              <Input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your name"
                disabled={joining || isConnecting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Room Code</label>
              <Input 
                type="text" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="bg-gray-800 border-gray-700 text-white uppercase tracking-widest font-mono"
                placeholder="Enter room code"
                maxLength={6}
                disabled={joining || isConnecting}
              />
            </div>

            {/* Phase 4: Character selection for staked matches */}
            {ownedCharacters.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Select Character (for staked matches)</label>
                <select
                  value={selectedCharacterIndex}
                  onChange={(e) => setSelectedCharacterIndex(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                  disabled={joining || isConnecting}
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
                <div className="flex justify-between">
                  <span className="text-gray-400">Wallet Balance:</span>
                  <span className="text-green-400">{getFormattedBalance()} ETH</span>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleJoinRoom}
              disabled={!name.trim() || !roomCode.trim() || joining || isConnecting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Join Battle Room
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-black px-4 text-sm text-gray-400">or</span>
              </div>
            </div>

            <Button
              onClick={toggleViewRooms}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white"
              disabled={isConnecting}
            >
              <Search className="mr-2 h-5 w-5" />
              {viewingRooms ? "Hide Available Matches" : "Browse Available Matches"}
            </Button>

            {viewingRooms && (
              <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-200">Available Matches</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRefreshRooms}
                    disabled={refreshingRooms || isConnecting || loadingMatches}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${refreshingRooms || loadingMatches ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {/* Phase 4: Show both regular rooms and contract matches */}
                <div className="space-y-2">
                  {/* Regular Rooms */}
                  {availableRooms.length > 0 && availableRooms
                    .filter(room => room.status === "waiting" && room.players.length < (room.maxPlayers || 2))
                    .map(room => (
                      <Card key={room.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-bold text-blue-400">{room.name || (room.hostName ? `${room.hostName}'s Room` : `Room ${room.id}`)}</h3>
                              <p className="text-xs text-gray-400">Free Room • Code: {room.id}</p>
                            </div>
                            <Button 
                              onClick={() => handleJoinSpecificRoom(room.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                              size="sm"
                              disabled={joining || isConnecting}
                            >
                              Join Free
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {/* Phase 4: Contract Matches */}
                  {availableMatches.map(match => (
                    <Card key={match.id} className="bg-gray-800 border-yellow-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-yellow-400 flex items-center">
                              <Coins className="h-4 w-4 mr-1" />
                              Staked Match #{match.id}
                            </h3>
                            <p className="text-xs text-gray-400">
                              Stake: {match.stake} ETH • Host: {Web3Utils.formatAddress(match.host as any)}
                            </p>
                            {!isWalletReady && (
                              <p className="text-xs text-red-400 flex items-center mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Wallet required
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button 
                              onClick={() => handleJoinContractMatch(match.id, match.stake)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-black"
                              size="sm"
                              disabled={joining || isConnecting || !isWalletReady || ownedCharacters.length === 0}
                            >
                              Join ({match.stake} ETH)
                            </Button>
                            {ownedCharacters.length > 0 && isWalletReady && (
                              <GasEstimation
                                functionName="joinMatch"
                                args={[BigInt(match.id), BigInt(ownedCharacters[selectedCharacterIndex]?.id || 0)]}
                                value={Web3Utils.parseEth(match.stake)}
                                showDetails={false}
                                className="text-xs"
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {availableRooms.length === 0 && availableMatches.length === 0 && !loadingMatches && (
                  <div className="text-center py-4 text-gray-400">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p>No available matches found</p>
                    <p className="text-sm mt-1">Create your own room or try again later</p>
                  </div>
                )}

                {loadingMatches && (
                  <div className="text-center py-4 text-blue-400">
                    <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Loading contract matches...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            {joiningContractMatch ? (
              <div className="space-y-4">
                <TransactionStatus
                  isLoading={joiningContractMatch}
                  error={error}
                  hash={transactionHash as any}
                  title="Joining Staked Match"
                  description="Broadcasting your entry to the blockchain..."
                />
              </div>
            ) : (
              <>
                <RefreshCw className="h-12 w-12 mx-auto mb-4 text-yellow-400 animate-spin" />
                <h2 className="text-xl font-bold text-yellow-400 mb-2">Joining Room...</h2>
                <p className="text-gray-300">Connecting to {roomCode}</p>
              </>
            )}
          </div>
        )}
      </motion.div>

      {!joining && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            onClick={handleBack}
            className="bg-gray-800/90 hover:bg-gray-700/90 text-white px-6 py-2 rounded-full"
            disabled={joining || isConnecting}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
        </motion.div>
      )}
    </div>
  )
}