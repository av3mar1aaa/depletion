import { useFrame, useThree } from '@react-three/fiber'
import { damp } from '../../lib/scroll'
import { animState } from '../../lib/animation'

const PAGE_CAMS = [
  { x: 0, y: 0.05, z: 5.0 },     // page 1 — hero with flower
  { x: -1.2, y: -0.2, z: 6.4 },  // page 2 — manifesto
  { x: 0, y: 0, z: 3.6 },        // page 3 — kakugan eye
  { x: 0, y: 0, z: 10.0 },       // page 4 — main content (post-intro)
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function ScrollCamera() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const v = animState.visualPage
    const act = animState.activity

    const maxIdx = PAGE_CAMS.length - 1
    const i = Math.max(1, Math.min(maxIdx, Math.floor(v)))
    const t = Math.max(0, Math.min(1, v - i))
    const a = PAGE_CAMS[i - 1]
    const b = PAGE_CAMS[i]

    const isEyeTransition =
      animState.phase === 'transition' && (animState.src === 3 || animState.dst === 3)
    const eyeAct = isEyeTransition ? animState.activity : 0
    const direction = animState.dst >= animState.src ? 1 : -1

    const extraZ = act * 1.6
    const extraRoll = act * 0.55

    const baseX = lerp(a.x, b.x, t)
    const baseY = lerp(a.y, b.y, t)
    const baseZ = lerp(a.z, b.z, t) + extraZ

    // Eye-dive: gentler pull toward the eye (stops around z≈1.8, not the plane itself)
    const eyeCenterZ = 1.8
    const targetX = baseX * (1 - eyeAct * 0.55)
    const targetY = baseY * (1 - eyeAct * 0.55)
    const targetZ = lerp(baseZ, eyeCenterZ, eyeAct * 0.75)
    const targetRoll = extraRoll + eyeAct * Math.PI * 0.9 * direction

    const lambda = isEyeTransition ? 3.6 : 2.2

    camera.position.x = damp(camera.position.x, targetX, lambda, delta)
    camera.position.y = damp(camera.position.y, targetY, lambda, delta)
    camera.position.z = damp(camera.position.z, targetZ, lambda, delta)
    camera.rotation.z = damp(camera.rotation.z, targetRoll, lambda, delta)
  })

  return null
}
