import { useEffect, useRef } from 'react'
import { animState } from '../lib/animation'
import { smoothstep } from '../lib/scroll'

const PAGES = [1, 2, 3]

export function PageIndicator() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dotRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const p = animState.visualPage
      // Hide the intro indicator once we cross into the post-intro page (4)
      const wrapOpacity = 1 - smoothstep(3.3, 3.7, p)
      if (wrapRef.current) wrapRef.current.style.opacity = String(wrapOpacity)
      for (let i = 0; i < PAGES.length; i++) {
        const idx = PAGES[i]
        const d = Math.abs(p - idx)
        const proximity = Math.max(0, 1 - d * 1.5)
        const dot = dotRefs.current[i]
        const label = labelRefs.current[i]
        if (dot) {
          dot.style.opacity = String(0.3 + proximity * 0.7)
          dot.style.transform = `scale(${0.7 + proximity * 0.6})`
        }
        if (label) {
          label.style.opacity = String(0.25 + proximity * 0.75)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={wrapRef}
      className="fixed right-6 md:right-10 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
    >
      <div className="flex flex-col gap-6">
        {PAGES.map((n, i) => (
          <div key={n} className="flex items-center gap-3">
            <span
              ref={(el) => {
                labelRefs.current[i] = el
              }}
              className="text-[10px] uppercase tracking-[0.4em] text-red-500/70 text-readable"
            >
              0{n}
            </span>
            <div
              ref={(el) => {
                dotRefs.current[i] = el
              }}
              className="page-dot"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
