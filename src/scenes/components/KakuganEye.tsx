import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { kakuganVertexShader, kakuganFragmentShader } from '../../shaders/kakugan'
import { animState } from '../../lib/animation'
import { smoothstep } from '../../lib/scroll'
import { hoverState } from '../../lib/hover'

// Must stay in sync with PLANE_W / PLANE_H constants in shaders/kakugan.ts
const EYE_WIDTH = 4.0
const EYE_HEIGHT = 2.0

export function KakuganEye() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const prevHoverRef = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPupilSize: { value: 0.5 },
      uReveal: { value: 0 },
      uFlicker: { value: 1 },
      uSurge: { value: 0 },
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    if (!materialRef.current) return
    const vPage = animState.visualPage
    // Eye is only visible on pages ~2.5–3.5. Skip all per-frame work outside that range.
    if (vPage < 1.8 || vPage > 3.6) {
      materialRef.current.uniforms.uReveal.value = 0
      return
    }
    const t = clock.elapsedTime
    materialRef.current.uniforms.uTime.value = t

    // Animated baseline — "in terror" pupil (mostly constricted, occasional dilations)
    const slowA = Math.sin(t * 0.55) * 0.65
    const slowB = Math.sin(t * 1.3 + 1.7) * 0.35
    const combined = (slowA + slowB + 1) * 0.5
    const dilation = Math.pow(combined, 3) * 0.88
    const microTwitch = Math.sin(t * 12.0) * 0.025
    const animatedSize = Math.max(0, Math.min(1, 0.1 + dilation + microTwitch))

    prevHoverRef.current = hoverState.eye

    // Target: max dilation when hovered, otherwise the animated baseline
    const isHovering = hoverState.eye === 1
    const target = isHovering ? 1.0 : animatedSize

    // Asymmetric damp: fast catch-up on hover-enter, slow contraction on hover-leave
    const lambda = isHovering ? 5 : 2.0

    const current = materialRef.current.uniforms.uPupilSize.value
    materialRef.current.uniforms.uPupilSize.value =
      current + (target - current) * (1 - Math.exp(-lambda * delta))

    // Reveal driven by page progression — fade in on 2→3, fade out on 3→4
    const revealIn = smoothstep(2.0, 2.95, animState.visualPage)
    const revealOut = 1 - smoothstep(3.1, 3.85, animState.visualPage)
    let reveal = revealIn * revealOut

    // During eye-dive transitions, force the eye fully visible so we're "sucked" into it
    const isEyeTransition =
      animState.phase === 'transition' && (animState.src === 3 || animState.dst === 3)
    if (isEyeTransition) {
      reveal = Math.max(reveal, animState.activity)
    }
    materialRef.current.uniforms.uReveal.value = reveal
    materialRef.current.uniforms.uFlicker.value = 1.0
    // Surge — lightning veins ignite during eye-dive
    materialRef.current.uniforms.uSurge.value = isEyeTransition ? animState.activity : 0
  })

  return (
    <group>
      {/* Visible eye plane — no pointer events on the whole plane anymore */}
      <mesh position={[0, 0, 0]} renderOrder={1}>
        <planeGeometry args={[EYE_WIDTH, EYE_HEIGHT]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={kakuganVertexShader}
          fragmentShader={kakuganFragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tiny invisible hover target right over the pupil/iris */}
      <mesh
        position={[0, 0, 0.02]}
        onPointerEnter={() => {
          if (animState.visualPage > 2.2) hoverState.eye = 1
        }}
        onPointerLeave={() => {
          hoverState.eye = 0
        }}
      >
        <circleGeometry args={[0.12, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}
