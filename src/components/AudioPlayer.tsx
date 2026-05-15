import { useEffect, useRef, useState } from 'react'

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/loop.wav`
const TARGET_VOLUME = 0.4
const STORAGE_KEY = 'isto-audio-muted'

// HTMLAudioElement is the most reliable cross-device audio API. iOS Safari is
// strict about both Web Audio (decodeAudioData on large files is flaky, and the
// physical silent switch mutes it) and HTML autoplay, so we attach the element
// to the DOM, attempt play() on every user gesture, and surface a button that
// also forces a play attempt on click.
export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : TARGET_VOLUME

    const onPlaying = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)

    const tryPlay = () => {
      const a = audioRef.current
      if (!a || !a.paused) return
      const p = a.play()
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          /* expected on first attempt before any gesture */
        })
      }
    }

    // Initial attempt — works on repeat visits in Chrome with sufficient
    // Media Engagement Index, or if the browser has whitelisted the origin.
    tryPlay()

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'touchstart',
      'touchend',
      'click',
      'keydown',
      'wheel',
    ]
    events.forEach((ev) => window.addEventListener(ev, tryPlay, { passive: true }))

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, tryPlay))
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : TARGET_VOLUME
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  }, [muted])

  const toggle = () => {
    setMuted((m) => !m)
    // The click is a fresh user gesture — force-start if we haven't yet
    const audio = audioRef.current
    if (audio && audio.paused) {
      audio.play().catch(() => {})
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        loop
        preload="auto"
        playsInline
        {...({ 'webkit-playsinline': 'true' } as Record<string, string>)}
        style={{ display: 'none' }}
      />
      <button
        onClick={toggle}
        className="fixed top-6 left-1/2 -translate-x-1/2 md:top-8 z-30 px-3 py-1.5 text-[10px] uppercase
                   tracking-[0.4em] text-neutral-500 hover:text-neutral-100 transition-colors text-readable
                   border border-neutral-800/60 hover:border-neutral-500/70 rounded-full bg-black/30 backdrop-blur-sm"
        aria-label={muted ? 'включить звук' : 'выключить звук'}
        title={muted ? 'включить звук' : 'выключить звук'}
      >
        {!playing ? '◌ звук' : muted ? '○ звук' : '◉ звук'}
      </button>
    </>
  )
}
