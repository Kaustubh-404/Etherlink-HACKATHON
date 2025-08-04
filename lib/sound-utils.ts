import { Howl } from "howler"

// Cache for loaded sound effects
const soundCache: Record<string, Howl> = {}

export function playSound(soundName: string): void {
  // Base path for sound effects
  const basePath = "/audio/"

  // If sound is already in cache, play it
  if (soundCache[soundName]) {
    soundCache[soundName].play()
    return
  }

  // Otherwise, load and play the sound
  const sound = new Howl({
    src: [basePath + soundName],
    volume: 0.7,
    onload: () => {
      // Add to cache once loaded
      soundCache[soundName] = sound
    },
    onloaderror: (id, error) => {
      // Handle missing audio files gracefully - don't log to console
      console.warn(`Audio file not found: ${soundName}. Skipping sound playback.`)
    },
  })

  sound.play()
}

export function stopSound(soundName: string): void {
  if (soundCache[soundName]) {
    soundCache[soundName].stop()
  }
}

export function preloadSounds(soundNames: string[]): void {
  soundNames.forEach((name) => {
    if (!soundCache[name]) {
      soundCache[name] = new Howl({
        src: ["/audio/" + name],
        preload: true,
        onloaderror: (id, error) => {
          // Handle missing audio files gracefully during preload
          console.warn(`Audio file not found during preload: ${name}. Skipping.`)
        },
      })
    }
  })
}
