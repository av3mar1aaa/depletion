import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { animState } from '../../lib/animation'
import { smoothstep, damp } from '../../lib/scroll'

type CentipedeProps = {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  seed?: number
  pageRange: [number, number]
  /** S-curve amplitude. Higher = more dramatic body curl. */
  curl?: number
  flip?: boolean
}

const BODY_SEGS = 28
const LEG_PAIRS = BODY_SEGS - 2
const BODY_LEN = 2.4

// Static jitter so legs aren't perfectly mirrored / aligned
function legJitter(i: number, side: number): { zTilt: number; phaseOff: number; lenJitter: number } {
  const seed = i * 7.3 + side * 113.5
  const zTilt = (Math.sin(seed * 12.9898) * 0.5) * 0.45
  const phaseOff = Math.sin(seed * 78.233) * 0.6
  const lenJitter = 0.85 + (Math.sin(seed * 43.97) * 0.5 + 0.5) * 0.3
  return { zTilt, phaseOff, lenJitter }
}

function Centipede({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  seed = 0,
  pageRange,
  curl = 0.55,
  flip = false,
}: CentipedeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const legsRef = useRef<THREE.InstancedMesh>(null)
  const bodyMat = useRef<THREE.MeshBasicMaterial>(null)
  const legMat = useRef<THREE.MeshBasicMaterial>(null)
  const opacityRef = useRef(0)

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const pathPoint = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const perp = useMemo(() => new THREE.Vector3(), [])
  const legDir = useMemo(() => new THREE.Vector3(), [])
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const tmpQuat = useMemo(() => new THREE.Quaternion(), [])
  const flipSign = flip ? -1 : 1

  // Precompute path points each frame; reusable buffer
  const points = useMemo(() => {
    const arr: THREE.Vector3[] = []
    for (let i = 0; i < BODY_SEGS; i++) arr.push(new THREE.Vector3())
    return arr
  }, [])

  useFrame(({ clock }, delta) => {
    if (!bodyRef.current || !legsRef.current) return
    const t = clock.elapsedTime

    // Visibility fades in/out of its page range
    const v = animState.visualPage
    const fadeIn = smoothstep(pageRange[0] - 0.4, pageRange[0], v)
    const fadeOut = 1 - smoothstep(pageRange[1], pageRange[1] + 0.4, v)
    const target = fadeIn * fadeOut
    opacityRef.current = damp(opacityRef.current, target, 2.5, delta)

    if (bodyMat.current) bodyMat.current.opacity = opacityRef.current * 0.95
    if (legMat.current) legMat.current.opacity = opacityRef.current * 0.7

    const visible = opacityRef.current > 0.01
    bodyRef.current.visible = visible
    legsRef.current.visible = visible
    if (!visible) return

    // ====== Build body path — slow S-curve with gentle wave riding on top ======
    const slowPhase = t * 0.45 + seed * 6.28
    for (let i = 0; i < BODY_SEGS; i++) {
      const ti = i / (BODY_SEGS - 1)
      const along = (ti - 0.5) * BODY_LEN
      // Base S-curve (static, defines the silhouette)
      const baseY = Math.sin(ti * Math.PI * 1.6 + seed * 1.3) * curl * flipSign
      // Slow undulation (the "alive" wave)
      const waveY = Math.sin(slowPhase + ti * 4.5) * 0.07
      // Z-bobbing for 3D feel — different phase per segment
      const z = Math.cos(slowPhase * 0.8 + ti * 5.0 + seed) * 0.10
      points[i].set(along, baseY + waveY, z)
    }

    // ====== BODY segments — small darker spheres oriented along path ======
    for (let i = 0; i < BODY_SEGS; i++) {
      const ti = i / (BODY_SEGS - 1)
      pathPoint.copy(points[i])

      // Tangent to next point — slight elongation along this direction
      if (i < BODY_SEGS - 1) tangent.subVectors(points[i + 1], points[i]).normalize()
      else tangent.subVectors(points[i], points[i - 1]).normalize()

      tmpQuat.setFromUnitVectors(yAxis, tangent)

      // Head is larger, tail tapers
      const headBoost = 1 + Math.exp(-ti * 14) * 0.55
      const tailTaper = 1 - smoothstep(0.85, 1.0, ti) * 0.55
      const r = 0.052 * headBoost * tailTaper

      dummy.position.copy(pathPoint)
      dummy.quaternion.copy(tmpQuat)
      // Slightly elongated capsule along path
      dummy.scale.set(r, r * 1.45, r * 0.85)
      dummy.updateMatrix()
      bodyRef.current.setMatrixAt(i, dummy.matrix)
    }
    bodyRef.current.instanceMatrix.needsUpdate = true

    // ====== LEGS — twitching cylinders extending perpendicular to body ======
    for (let i = 0; i < LEG_PAIRS; i++) {
      const segIdx = i + 1 // skip head
      const ti = segIdx / (BODY_SEGS - 1)
      pathPoint.copy(points[segIdx])

      // Tangent at this segment
      tangent.subVectors(points[segIdx + 1], points[segIdx - 1]).normalize()
      // Perpendicular in XY plane (will be tilted slightly in Z per leg)
      perp.set(-tangent.y, tangent.x, 0).normalize()

      // Legs get a bit shorter toward the tail
      const lenScale = 1 - smoothstep(0.7, 1.0, ti) * 0.35

      for (let side = 0; side < 2; side++) {
        const sideDir = side === 0 ? 1 : -1
        const jit = legJitter(i, side)

        // Travelling-wave twitch along body
        const legPhase = t * 4.2 + i * 0.42 + (side === 0 ? 0 : Math.PI * 0.5) + jit.phaseOff
        const reach = 0.18 * lenScale * jit.lenJitter * (0.78 + 0.22 * Math.sin(legPhase))

        legDir.set(perp.x * sideDir, perp.y * sideDir, jit.zTilt * sideDir).normalize()
        tmpQuat.setFromUnitVectors(yAxis, legDir)

        // Position is midpoint of (segment, segment + legDir * reach)
        const halfReach = reach * 0.5
        dummy.position.set(
          pathPoint.x + legDir.x * halfReach,
          pathPoint.y + legDir.y * halfReach,
          pathPoint.z + legDir.z * halfReach,
        )
        dummy.quaternion.copy(tmpQuat)
        dummy.scale.set(0.0055, reach, 0.0055)
        dummy.updateMatrix()
        legsRef.current.setMatrixAt(i * 2 + side, dummy.matrix)
      }
    }
    legsRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, BODY_SEGS]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial
          ref={bodyMat}
          color="#160205"
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={legsRef} args={[undefined, undefined, LEG_PAIRS * 2]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshBasicMaterial
          ref={legMat}
          color="#3a0008"
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}

// Placements: a few centipedes scattered as corner decorations across the intro pages.
export function Centipedes() {
  return (
    <>
      {/* Page 1 — upper-left, curling toward the flower */}
      <Centipede
        position={[-2.6, 1.7, -0.4]}
        rotation={[0, 0, -0.4]}
        scale={0.75}
        seed={0.13}
        pageRange={[0.7, 2.3]}
        curl={0.5}
      />
      {/* Page 1-2 — lower-right, smaller */}
      <Centipede
        position={[2.4, -1.6, -0.6]}
        rotation={[0, 0, 2.6]}
        scale={0.55}
        seed={0.71}
        pageRange={[0.7, 2.4]}
        curl={0.4}
        flip
      />
      {/* Page 2 — bottom-left of manifesto */}
      <Centipede
        position={[-2.9, -1.5, -0.8]}
        rotation={[0, 0, 0.9]}
        scale={0.65}
        seed={0.39}
        pageRange={[1.6, 2.7]}
        curl={0.55}
      />
      {/* Page 3 — curling beside the kakugan eye (top-left corner) */}
      <Centipede
        position={[-1.6, 1.1, 0.2]}
        rotation={[0, 0, -1.1]}
        scale={0.55}
        seed={0.58}
        pageRange={[2.6, 3.5]}
        curl={0.65}
        flip
      />
    </>
  )
}
