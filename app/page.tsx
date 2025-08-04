"use client"

import { useState, useEffect } from "react"
import { GameStateProvider } from "@/components/game-state-provider"

import MainMenu from "@/components/main-menu"
import GameScreenComponent from "@/components/game-screen"
import CharacterSelect from "@/components/character-select"
import GameOver from "@/components/game-over"
import VictoryScreen from "@/components/victory-screen"
import LoadingScreen from "@/components/loading-screen"
import SettingsScreen from "@/components/settings-screen"
import MultiplayerMenu from "@/components/multiplayer-menu"
import CreateRoom from "@/components/create-room"
import CreateRoomContract from "@/components/create-room-contract"
import CreatePvPRoom from "@/components/create-pvp-room"
import JoinRoom from "@/components/join-room"
import JoinPvPRoom from "@/components/join-pvp-room"
import MultiplayerBattleRoom from "@/components/multiplayer-battle-room"
import ContractBattleRoom from "@/components/contract-battle-room"
import MultiplayerBattle from "@/components/multiplayer-battle"
import ContractPvPBattle from "@/components/contract-pvp-battle"
import AudioManager from "@/components/audio-manager"
import GameNotifications from "@/components/game-notification"
import { useGameState } from "@/components/game-state-provider" 
import { Howl } from "howler"

export type GameScreen = 
  | "loading" 
  | "main-menu" 
  | "character-select" 
  | "game" 
  | "game-over" 
  | "victory" 
  | "settings"
  | "multiplayer-menu"
  | "create-room"
  | "create-room-contract"
  | "create-pvp-room"
  | "join-room"
  | "join-pvp-room"
  | "multiplayer-room"
  | "contract-battle-room"
  | "multiplayer-character-select"
  | "multiplayer-battle"
  | "contract-pvp-battle"

// CREATE A WRAPPER COMPONENT TO ACCESS GAME STATE
function GameContent() {
  const { notifications, dismissNotification } = useGameState() // ACCESS NOTIFICATIONS FROM GAME STATE
  
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("loading")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [musicVolume, setMusicVolume] = useState(0.5)
  const [sfxVolume, setSfxVolume] = useState(0.7)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [gameMode, setGameMode] = useState<"singleplayer" | "multiplayer">("singleplayer")

  // ... rest of your existing logic stays the same ...

  // Simulate loading assets
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
      setCurrentScreen("main-menu")
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Initialize background music
  useEffect(() => {
    const bgMusic = new Howl({
      src: ["/audio/main-theme.mp3"],
      loop: true,
      volume: musicVolume,
      autoplay: false,
      onloaderror: (id, error) => {
        // Handle missing main theme gracefully
        console.warn("Background music file not found. Playing in silent mode.")
      },
    })

    if (isLoaded && !isMusicPlaying) {
      bgMusic.play()
      setIsMusicPlaying(true)
    }

    return () => {
      bgMusic.stop()
    }
  }, [isLoaded, isMusicPlaying, musicVolume])

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled)
  }

  const updateMusicVolume = (volume: number) => {
    setMusicVolume(volume)
  }

  const updateSfxVolume = (volume: number) => {
    setSfxVolume(volume)
  }
  
  // Handle room creation/joining
  const handleRoomCreated = (roomId: string) => {
    setActiveRoomId(roomId)
    // Route to appropriate waiting room first, not directly to battle
    if (roomId.startsWith("CONTRACT_") || roomId.startsWith("PVP_")) {
      setCurrentScreen("contract-battle-room") // Go to waiting room first
    } else {
      setCurrentScreen("multiplayer-room")
    }
  }

  const handleRoomJoined = (roomId: string) => {
    setActiveRoomId(roomId)
    // Route to contract PvP battle for enhanced rooms
    if (roomId.startsWith("CONTRACT_") || roomId.startsWith("PVP_")) {
      setCurrentScreen("contract-pvp-battle")
    } else {
      setCurrentScreen("multiplayer-room")
    }
  }

  return (
    <>
      {/* ADD NOTIFICATIONS COMPONENT HERE - RIGHT AFTER THE OPENING FRAGMENT */}
      <GameNotifications 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />
      
        <AudioManager soundEnabled={soundEnabled} musicVolume={musicVolume} sfxVolume={sfxVolume} />

        {currentScreen === "loading" && <LoadingScreen />}

        {currentScreen === "main-menu" && (
          <MainMenu
            onPlay={() => {
              setGameMode("singleplayer")
              setCurrentScreen("character-select")
            }}
            onMultiplayer={() => {
              setGameMode("multiplayer")
              setCurrentScreen("multiplayer-menu")
            }}
            onSettings={() => setCurrentScreen("settings")}
            soundEnabled={soundEnabled}
            toggleSound={toggleSound}
          />
        )}

        {/* Single Player Screens */}
        {currentScreen === "character-select" && (
          <CharacterSelect 
            onSelect={() => setCurrentScreen("game")} 
            onBack={() => setCurrentScreen("main-menu")} 
          />
        )}

        {currentScreen === "game" && (
          <GameScreenComponent
            onGameOver={() => setCurrentScreen("game-over")}
            onVictory={() => setCurrentScreen("victory")}
            onExit={() => setCurrentScreen("main-menu")}
          />
        )}

        {currentScreen === "game-over" && (
          <GameOver 
            onRestart={() => setCurrentScreen("game")} 
            onMainMenu={() => setCurrentScreen("main-menu")} 
          />
        )}

        {currentScreen === "victory" && (
          <VictoryScreen 
            onContinue={() => setCurrentScreen("game")} 
            onMainMenu={() => setCurrentScreen("main-menu")} 
          />
        )}

        {/* Multiplayer Screens */}
        {currentScreen === "multiplayer-menu" && (
          <MultiplayerMenu
            onCreateRoom={() => setCurrentScreen("create-pvp-room")}
            onCreateContractRoom={() => setCurrentScreen("create-room-contract")}
            onJoinRoom={() => setCurrentScreen("join-pvp-room")}
            onBack={() => setCurrentScreen("main-menu")}
          />
        )}

        {currentScreen === "create-room" && (
          <CreateRoom
            onBack={() => setCurrentScreen("multiplayer-menu")}
            onRoomCreated={handleRoomCreated}
          />
        )}

        {currentScreen === "create-room-contract" && (
          <CreateRoomContract
            onBack={() => setCurrentScreen("multiplayer-menu")}
            onRoomCreated={handleRoomCreated}
          />
        )}

        {currentScreen === "create-pvp-room" && (
          <CreatePvPRoom
            onBack={() => setCurrentScreen("multiplayer-menu")}
            onRoomCreated={handleRoomCreated}
          />
        )}

        {currentScreen === "join-room" && (
          <JoinRoom
            onBack={() => setCurrentScreen("multiplayer-menu")}
            onRoomJoined={handleRoomJoined}
          />
        )}

        {currentScreen === "join-pvp-room" && (
          <JoinPvPRoom
            onBack={() => setCurrentScreen("multiplayer-menu")}
            onRoomJoined={handleRoomJoined}
          />
        )}

        {currentScreen === "multiplayer-room" && (
          <MultiplayerBattleRoom
            onBack={() => {
              setActiveRoomId(null)
              setCurrentScreen("multiplayer-menu")
            }}
            onCharacterSelect={() => setCurrentScreen("multiplayer-character-select")}
            onStartBattle={() => setCurrentScreen("multiplayer-battle")}
            onEndBattle={() => setCurrentScreen("multiplayer-menu")}
          />
        )}

        {/* Removed old contract-room - using contract-battle-room instead */}
        {false && (
          <ContractBattleRoom
            onBack={() => {
              setActiveRoomId(null)
              setCurrentScreen("multiplayer-menu")
            }}
            onCharacterSelect={() => setCurrentScreen("multiplayer-character-select")}
            onStartBattle={() => setCurrentScreen("multiplayer-battle")}
            onEndBattle={() => setCurrentScreen("multiplayer-menu")}
          />
        )}

        {currentScreen === "multiplayer-character-select" && (
          <CharacterSelect 
            onSelect={() => setCurrentScreen("multiplayer-room")} 
            onBack={() => setCurrentScreen("multiplayer-room")} 
            isMultiplayer={true}
          />
        )}

        {currentScreen === "multiplayer-battle" && (
          <MultiplayerBattle
            onGameOver={() => setCurrentScreen("game-over")}
            onVictory={() => setCurrentScreen("victory")}
            onExit={() => {
              setActiveRoomId(null)
              setCurrentScreen("multiplayer-menu")
            }}
          />
        )}

        {currentScreen === "contract-battle-room" && (
          <ContractBattleRoom
            onBack={() => {
              setActiveRoomId(null)
              setCurrentScreen("multiplayer-menu")
            }}
            onCharacterSelect={() => setCurrentScreen("character-select")}
            onStartBattle={() => setCurrentScreen("contract-pvp-battle")}
            onEndBattle={() => {
              setActiveRoomId(null)
              setCurrentScreen("main-menu")
            }}
          />
        )}

        {currentScreen === "contract-pvp-battle" && (
          <ContractPvPBattle
            onGameOver={() => setCurrentScreen("game-over")}
            onVictory={() => setCurrentScreen("victory")}
            onExit={() => {
              setActiveRoomId(null)
              setCurrentScreen("multiplayer-menu")
            }}
          />
        )}

        {currentScreen === "settings" && (
          <SettingsScreen
            onBack={() => setCurrentScreen("main-menu")}
            soundEnabled={soundEnabled}
            toggleSound={toggleSound}
            musicVolume={musicVolume}
            sfxVolume={sfxVolume}
            updateMusicVolume={updateMusicVolume}
            updateSfxVolume={updateSfxVolume}
          />
        )}
    </>
  )
}

// MAIN COMPONENT - WRAP GameContent WITH PROVIDERS
export default function Home() {
  return (
    <GameStateProvider>
      <GameContent />
    </GameStateProvider>
  )
}