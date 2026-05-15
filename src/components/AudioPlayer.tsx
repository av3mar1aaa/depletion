import { useEffect, useRef, useState } from 'react'

const AUDIO_SRC = '/audio/loop.wav'
const TARGET_VOLUME = 0.4
const STORAGE_KEY = 'isto-audio-muted'

// Gapless loop via Web Audio API. HTML <audio loop> has a perceptible gap at
// the seam in most browsers (decoder timing). AudioBufferSourceNode.loop is
// sample-accurate, so the loop is truly continuous.
export function AudioPlayer() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      type AnyWin = Window & { webkitAudioContext?: typeof AudioContext }
      const Ctor =
        window.AudioContext || (window as unknown as AnyWin).webkitAudioContext
      if (!Ctor) {
        // eslint-disable-next-line no-console
        console.warn('[audio] Web Audio API not supported')
        return
      }
      const ctx = new Ctor()
      ctxRef.current = ctx

      const gain = ctx.createGain()
      gain.gain.value = muted ? 0 : TARGET_VOLUME
      gain.connect(ctx.destination)
      gainRef.current = gain

      try {
        const response = await fetch(AUDIO_SRC)
        const arrayBuffer = await response.arrayBuffer()
        if (cancelled) return
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        if (cancelled) return

        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.loop = true
        source.connect(gain)
        source.start(0)
        sourceRef.current = source

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {})
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[audio] init failed:', err)
      }
    }

    init()

    // Any user gesture resumes a suspended context (browser autoplay policy)
    const resume = () => {
      const ctx = ctxRef.current
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
    }
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'mousemove',
      'wheel',
      'touchstart',
      'keydown',
      'click',
    ]
    events.forEach((ev) => window.addEventListener(ev, resume, { passive: true }))

    return () => {
      cancelled = true
      events.forEach((ev) => window.removeEventListener(ev, resume))
      try {
        sourceRef.current?.stop()
      } catch (_) {
        /* source may not have started yet */
      }
      ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
      gainRef.current = null
      sourceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const gain = gainRef.current
    const ctx = ctxRef.current
    if (gain && ctx) {
      // Tiny ramp so toggling doesn't click
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(muted ? 0 : TARGET_VOLUME, now + 0.04)
    }
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  }, [muted])

  const toggle = () => {
    setMuted((m) => !m)
    const ctx = ctxRef.current
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }

  return (
    <button
      onClick={toggle}
      className="fixed top-6 left-1/2 -translate-x-1/2 md:top-8 z-30 px-3 py-1.5 text-[10px] uppercase
                 tracking-[0.4em] text-neutral-500 hover:text-neutral-100 transition-colors text-readable
                 border border-neutral-800/60 hover:border-neutral-500/70 rounded-full bg-black/30 backdrop-blur-sm"
      aria-label={muted ? 'включить звук' : 'выключить звук'}
      title={muted ? 'включить звук' : 'выключить звук'}
    >
      {muted ? '○ звук' : '◉ звук'}
    </button>
  )
}
