import { useEffect, useRef } from 'react'
import { HeroScene } from './scenes/HeroScene'
import { smoothstep } from './lib/scroll'
import { animState, jumpToPage } from './lib/animation'
import { Cursor } from './components/Cursor'
import { PageIndicator } from './components/PageIndicator'
import { AudioPlayer } from './components/AudioPlayer'

export default function App() {
  const page1Ref = useRef<HTMLDivElement>(null)
  const page2Ref = useRef<HTMLDivElement>(null)
  const page3Ref = useRef<HTMLDivElement>(null)
  const page4Ref = useRef<HTMLDivElement>(null)
  const kanjiRef = useRef<HTMLDivElement>(null)
  const eyeKanjiRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = animState.visualPage
      const act = animState.activity

      const page1Opacity = 1 - smoothstep(1.35, 1.55, v)
      const page2Opacity = smoothstep(1.45, 1.65, v) * (1 - smoothstep(2.35, 2.55, v))
      // Page 3 (eye) fades in on 2→3 and back out as we leave for the empty post-intro page
      const page3Opacity = smoothstep(2.45, 2.7, v) * (1 - smoothstep(3.35, 3.7, v))
      const page4Opacity = smoothstep(3.55, 3.9, v)

      // Background kanji dims at the peak of any transition
      const kanjiBaseFade = 1 - smoothstep(1.7, 2.0, v)
      const kanjiActiveFade = 1 - act * 0.7
      const kanjiFade = kanjiBaseFade * kanjiActiveFade

      // Page 3 background kanji 眼 (eye)
      const eyeKanjiFade = smoothstep(2.5, 2.95, v) * (1 - smoothstep(3.35, 3.7, v)) * 0.18

      // Skip-intro link visible during the intro pages (1-3), fades out on page 4
      const skipOpacity = 1 - smoothstep(3.3, 3.7, v)

      if (page1Ref.current) page1Ref.current.style.opacity = String(page1Opacity)
      if (page2Ref.current) page2Ref.current.style.opacity = String(page2Opacity)
      if (page3Ref.current) page3Ref.current.style.opacity = String(page3Opacity)
      if (page4Ref.current) page4Ref.current.style.opacity = String(page4Opacity)
      if (kanjiRef.current) kanjiRef.current.style.opacity = String(kanjiFade)
      if (eyeKanjiRef.current) eyeKanjiRef.current.style.opacity = String(eyeKanjiFade)
      if (skipRef.current) {
        skipRef.current.style.opacity = String(skipOpacity)
        skipRef.current.style.pointerEvents = skipOpacity > 0.1 ? 'auto' : 'none'
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <Cursor />
      <PageIndicator />
      <AudioPlayer />

      <div className="fixed inset-0">
        <HeroScene />
      </div>

      <div
        ref={kanjiRef}
        aria-hidden
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <span
          className="font-semibold leading-none text-red-900/[0.08]"
          style={{ fontSize: 'min(75vh, 75vw)' }}
        >
          虚
        </span>
      </div>

      <div
        ref={eyeKanjiRef}
        aria-hidden
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none opacity-0"
      >
        <span
          className="font-semibold leading-none text-red-900/[0.18]"
          style={{ fontSize: 'min(82vh, 82vw)' }}
        >
          眼
        </span>
      </div>

      <section
        ref={page1Ref}
        className="fixed inset-0 z-10 flex flex-col justify-between p-6 md:p-10 pointer-events-none"
      >
        <header className="flex items-start justify-between gap-6">
          <div className="reveal delay-100">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-red-500/80 mb-2 text-readable">
              彼岸花 · Lycoris radiata
            </p>
            <h1 className="text-xl md:text-2xl font-medium tracking-tight text-neutral-100 text-readable">
              ИСТОЩЕНИЕ <span className="font-display text-neutral-400">· depletion</span>
            </h1>
          </div>
          <div className="text-right text-[10px] md:text-xs uppercase tracking-[0.4em] text-neutral-400 text-readable reveal delay-300">
            <div>MMXXVI</div>
            <div className="text-neutral-600 mt-1 hidden md:block">id · h-7t4</div>
          </div>
        </header>

        <div className="flex items-end justify-between gap-6">
          <div className="max-w-sm reveal delay-500">
            <p className="text-sm md:text-base text-neutral-200 leading-relaxed text-readable">
              Зал. Холод. Тишина. Работа.
            </p>
            <p className="mt-2 text-xs md:text-sm text-neutral-400 leading-relaxed text-readable max-w-xs">
              Ничто не имеет значения. Тем более — стоит делать хорошо.
            </p>
          </div>
          <div className="text-right text-[10px] md:text-xs uppercase tracking-[0.4em] text-neutral-500 text-readable reveal delay-700">
            <div className="animate-pulse">↓ ниже</div>
          </div>
        </div>
      </section>

      <section
        ref={page2Ref}
        className="fixed inset-0 z-10 flex items-center p-6 md:p-16 pointer-events-none opacity-0"
      >
        <div className="max-w-xl">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-red-500/80 mb-6 text-readable">
            манифест · 空虚
          </p>
          <h2 className="text-3xl md:text-6xl font-medium leading-[1.05] tracking-tight text-neutral-100 text-readable">
            Всё <span className="font-display text-neutral-400 italic text-2xl md:text-4xl align-top">—</span> напрасно.<br />
            <span className="text-red-500">Это не повод</span><br />
            <span className="font-display italic">делать плохо.</span>
          </h2>
          <p className="mt-8 max-w-md text-sm md:text-base text-neutral-300 leading-relaxed text-readable">
            Что бы ты ни делал — это попытка закрыть пустоту. Зал, холод, работа,
            любовь, чтение, тишина. Всё — заплатки. Иллюзия целостности.
            Знание этого ничего не меняет. Оно меняет только вопрос: не «зачем»,
            а «как». Раз уж всё равно напрасно — почему бы не быть тем, кто
            делает напрасное лучше всех.
          </p>
          <div className="mt-12 text-[10px] md:text-xs uppercase tracking-[0.4em] text-neutral-500 text-readable animate-pulse">
            ↓ глубже
          </div>
        </div>
      </section>

      <section
        ref={page3Ref}
        className="fixed inset-0 z-10 flex flex-col justify-between p-6 md:p-10 pointer-events-none opacity-0"
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-red-500/90 mb-2 text-readable">
              赫眼 · kakugan · 003
            </p>
            <h2 className="text-xl md:text-3xl font-medium tracking-tight text-neutral-100 text-readable">
              Состояние: пустой
            </h2>
          </div>
          <div className="text-right text-[10px] md:text-xs uppercase tracking-[0.4em] text-red-500/80 text-readable">
            <div>state · 03/03</div>
            <div className="text-neutral-500 mt-1 hidden md:block">void · awake</div>
          </div>
        </header>

        <div className="flex items-end justify-between gap-6">
          <div className="max-w-sm">
            <p className="text-sm md:text-base text-neutral-200 leading-relaxed text-readable">
              Под всем, что ты делаешь —
              <br />
              пустота. Иногда она открывает глаз.
            </p>
            <p className="mt-2 text-xs md:text-sm text-neutral-500 leading-relaxed text-readable max-w-xs">
              И отвечает красным.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] md:text-xs uppercase tracking-[0.4em] text-neutral-300 pointer-events-auto text-readable">
            <a href="#" className="hover:text-white transition-colors">telegram</a>
            <a href="#" className="hover:text-white transition-colors">instagram</a>
            <a href="#" className="hover:text-white transition-colors">github</a>
          </nav>
        </div>
      </section>

      <section
        ref={page4Ref}
        className="fixed inset-0 z-10 flex flex-col p-6 md:p-10 pointer-events-none opacity-0"
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-red-500/70 mb-2 text-readable">
              ИСТОЩЕНИЕ · index
            </p>
            <h2 className="text-xl md:text-2xl font-medium tracking-tight text-neutral-200 text-readable">
              Здесь скоро.
            </h2>
          </div>
          <div className="text-right text-[10px] md:text-xs uppercase tracking-[0.4em] text-neutral-500 text-readable">
            <div>MMXXVI</div>
          </div>
        </header>
      </section>

      <button
        ref={skipRef}
        onClick={() => jumpToPage(4)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 text-[10px] uppercase
                   tracking-[0.4em] text-neutral-400 hover:text-neutral-100 transition-colors text-readable
                   border border-neutral-700/50 hover:border-neutral-400/70 rounded-full bg-black/30 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
      >
        пропустить заставку ↘
      </button>
    </>
  )
}
