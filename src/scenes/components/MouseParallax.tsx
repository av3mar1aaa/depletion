import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { damp, mouseRef } from '../../lib/mouse'
import { smoothstep } from '../../lib/scroll'
import { animState } from '../../lib/animation'

export function MouseParallax({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!ref.current) return
    const transitionFade = 1 - animState.activity
    const pageFade = 1 - smoothstep(1.7, 2.3, animState.visualPage)
    const strength = transitionFade * pageFade

    // Subtle positional drift, soft damp for smoothness
    ref.current.position.x = damp(ref.current.position.x, mouseRef.x * 0.12 * strength, 2.0, delta)
    ref.current.position.y = damp(ref.current.position.y, mouseRef.y * 0.08 * strength, 2.0, delta)

    // Larger rotation amplitude + faster catch-up for responsive cursor steering
    ref.current.rotation.y = damp(ref.current.rotation.y, mouseRef.x * 1.2 * strength, 4.0, delta)
    ref.current.rotation.x = damp(ref.current.rotation.x, mouseRef.y * 0.35 * strength, 4.0, delta)
  })

  return <group ref={ref}>{children}</group>
}
