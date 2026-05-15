type Phase = 'idle' | 'transition'

export const animState = {
  src: 1,
  dst: 1,
  progress: 0,
  phase: 'idle' as Phase,
  visualPage: 1,
  activity: 0,
}

const ANIM_DURATION = 2.9
const MIN_PAGE = 1
const MAX_PAGE = 4
const SIGNIFICANT_DELTA = 12
// After any page transition completes, ignore wheel events for this long —
// fully consumes the inertia tail of the swipe that drove the transition so
// it can't immediately cascade into a second one.
const POST_TRANSITION_LOCKOUT_MS = 800

let animStartTime = 0
let lastPageTransitionEnd = -10000

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function trigger(direction: 'forward' | 'backward') {
  if (animState.phase === 'transition') return

  const target = direction === 'forward' ? animState.src + 1 : animState.src - 1
  if (target < MIN_PAGE || target > MAX_PAGE) return

  animState.dst = target
  animState.progress = 0
  animState.phase = 'transition'
  animStartTime = performance.now() / 1000
}

export function jumpToPage(target: number) {
  if (animState.phase === 'transition') return
  if (target < MIN_PAGE || target > MAX_PAGE) return
  if (target === animState.src) return
  animState.dst = target
  animState.progress = 0
  animState.phase = 'transition'
  animStartTime = performance.now() / 1000
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    (e) => {
      if (animState.phase === 'transition') return
      if (Math.abs(e.deltaY) < SIGNIFICANT_DELTA) return

      // Post-transition lockout — eats inertia tail of the just-finished swipe.
      if (performance.now() - lastPageTransitionEnd < POST_TRANSITION_LOCKOUT_MS) return

      if (e.deltaY > 0) trigger('forward')
      else trigger('backward')
    },
    { passive: true },
  )

  let touchStartY = 0
  let touchActive = false
  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return
      touchStartY = e.touches[0].clientY
      touchActive = true
    },
    { passive: true },
  )
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!touchActive || e.touches.length !== 1) return
      const dy = touchStartY - e.touches[0].clientY
      if (Math.abs(dy) < 30) return
      if (dy > 0) trigger('forward')
      else trigger('backward')
      touchActive = false
    },
    { passive: true },
  )
  window.addEventListener('touchend', () => { touchActive = false }, { passive: true })

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') trigger('forward')
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') trigger('backward')
  })

  const tick = () => {
    if (animState.phase === 'transition') {
      const elapsed = performance.now() / 1000 - animStartTime
      const tNorm = Math.min(1, elapsed / ANIM_DURATION)
      const eased = easeOutCubic(tNorm)
      animState.progress = eased
      animState.visualPage = animState.src + (animState.dst - animState.src) * eased
      animState.activity = Math.sin(eased * Math.PI)
      if (tNorm >= 1) {
        animState.src = animState.dst
        animState.progress = 0
        animState.visualPage = animState.src
        animState.activity = 0
        animState.phase = 'idle'
        lastPageTransitionEnd = performance.now()
      }
    } else {
      animState.visualPage = animState.src
      animState.activity = 0
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
