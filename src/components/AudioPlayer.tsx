import { useEffect, useRef, useState } from 'react'

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/loop.wav`
const TARGET_VOLUME = 0.4
const STORAGE_KEY = 'isto-audio-muted'

// Mobile Safari refuses to start an AudioContext (let alone decode/play) unless
// the very FIRST call is made inside a user gesture handler. Creating the context
// in a normal useEffect leaves it permanently suspended on iOS even if you
// resume() later. So we defer everything to the first touch/click/keydown.
export function AudioPlayer() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })
  const [ready, setReady] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const initStartedRef = useRef(false)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (initStartedRef.current) return
      initStartedRef.current = true

      type AnyWin = Window & { webkitAudioContext?: typeof AudioContext }
      const Ctor =
        window.AudioContext || (window as unknown as AnyWin).webkitAudioContext
      if (!Ctor) return

      try {
        const ctx = new Ctor()
        // Resume eagerly — needed on iOS even when created inside a gesture
        if (ctx.state === 'suspended') {
          try {
            await ctx.resume()
          } catch (_) {
            /* ignore */
          }
        }
        ctxRef.current = ctx

        const gain = ctx.createGain()
        gain.gain.value = mutedRef.current ? 0 : TARGET_VOLUME
        gain.connect(ctx.destination)
        gainRef.current = gain

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
        setReady(true)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[audio] init failed:', err)
        initStartedRef.current = false
      }
    }

    const onGesture = () => {
      init()
    }

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'touchstart',
      'touchend',
      'click',
      'keydown',
      'wheel',
    ]
    events.forEach((ev) =>
      window.addEventListener(ev, onGesture, { passive: true, once: true }),
    )

    return () => {
      cancelled = true
      events.forEach((ev) => window.removeEventListener(ev, onGesture))
      try {
        sourceRef.current?.stop()
      } catch (_) {
        /* ignore */
      }
      ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
      gainRef.current = null
      sourceRef.current = null
    }
  }, [])

  useEffect(() => {
    const gain = gainRef.current
    const ctx = ctxRef.current
    if (gain && ctx) {
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(muted ? 0 : TARGET_VOLUME, now + 0.04)
    }
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  }, [muted])

  const toggle = () => {
    setMuted((m) => !m)
    // The button click is itself a user gesture — also use it to kick off init
    // if it hasn't happened yet (e.g. user's first touch lands on the button).
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
      {!ready ? '◌ звук' : muted ? '○ звук' : '◉ звук'}
    </button>
  )
}
