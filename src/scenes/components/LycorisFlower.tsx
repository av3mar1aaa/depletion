import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { lycorisVertexShader, lycorisFragmentShader } from '../../shaders/lycoris'
import { smoothstep } from '../../lib/scroll'
import { animState } from '../../lib/animation'
import { hoverState } from '../../lib/hover'
import { adaptive } from '../../lib/adaptive'

function computeLift(activity: number, phase: number): number {
  return activity * (0.85 + phase * 0.35) * 0.8
}

const PETAL_COUNT = adaptive.petalCount
const PETAL_LENGTH = 1.0
const PETAL_WIDTH = 0.085
const PETAL_THICKNESS = 0.0042
const STAMEN_COUNT = adaptive.stamenCount
const STAMEN_TIP_RADIUS = 0.0095

function makeRng(seed: number) {
  let s = (seed | 0) || 1
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function buildPetalGeometry(): THREE.BufferGeometry {
  const lengthSegs = adaptive.isMobile ? 48 : 80
  const ringSegs = adaptive.isMobile ? 8 : 10

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs
    let wf = Math.pow(Math.sin(t * Math.PI), 0.4)
    wf *= 1 + Math.sin(t * 5.5) * 0.02
    const halfWidth = PETAL_WIDTH * wf
    const halfThickness = PETAL_THICKNESS * wf

    for (let j = 0; j < ringSegs; j++) {
      const a = (j / ringSegs) * Math.PI * 2
      const cosA = Math.cos(a)
      const sinA = Math.sin(a)
      positions.push(cosA * halfWidth, t * PETAL_LENGTH, sinA * halfThickness)

      let nx = cosA / Math.max(halfWidth, 1e-5)
      let nz = sinA / Math.max(halfThickness, 1e-5)
      const nl = Math.sqrt(nx * nx + nz * nz) || 1
      normals.push(nx / nl, 0, nz / nl)

      uvs.push(j / ringSegs, t)
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < ringSegs; j++) {
      const a = i * ringSegs + j
      const b = i * ringSegs + ((j + 1) % ringSegs)
      const c = (i + 1) * ringSegs + j
      const d = (i + 1) * ringSegs + ((j + 1) % ringSegs)
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geo
}

type StamenAsset = { geo: THREE.TubeGeometry; tip: THREE.Vector3 }

function buildStamenAsset(length: number, bend: number, twist: number, radius: number): StamenAsset {
  const points: THREE.Vector3[] = []
  const segs = 12
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const x = twist * Math.sin(t * Math.PI) * length * 0.18
    const y = t * length * (1 - bend * t * 0.22)
    const z = bend * length * t * t
    points.push(new THREE.Vector3(x, y, z))
  }
  const curve = new THREE.CatmullRomCurve3(points)
  const tubeSegs = adaptive.isMobile ? 18 : 36
  const radial = adaptive.isMobile ? 5 : 6
  const geo = new THREE.TubeGeometry(curve, tubeSegs, radius, radial, false)
  const tip = points[points.length - 1].clone()
  return { geo, tip }
}

type PetalConfig = {
  azimuth: number
  tilt: number
  roll: number
  scale: number
  phase: number
}

type StamenConfig = {
  azimuth: number
  tilt: number
  roll: number
  variant: number
  phase: number
}

type PetalProps = {
  geometry: THREE.BufferGeometry
  phase: number
  matRef: (m: THREE.ShaderMaterial | null) => void
}

function Petal({ geometry, phase, matRef }: PetalProps) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBloom: { value: 1 },
      uPhase: { value: phase },
      uHeight: { value: PETAL_LENGTH },
      uLift: { value: 0 },
      uOpen: { value: 0 },
      uColorBase: { value: new THREE.Color('#020000') },
      uColorMid: { value: new THREE.Color('#380004') },
      uColorTip: { value: new THREE.Color('#88000c') },
      uColorGlow: { value: new THREE.Color('#bc1820') },
      uColorSpec: { value: new THREE.Color('#d04050') },
    }),
    [phase],
  )

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={lycorisVertexShader}
        fragmentShader={lycorisFragmentShader}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function Stamens({
  configs,
  assets,
}: {
  configs: StamenConfig[]
  assets: StamenAsset[]
}) {
  const innerRefs = useRef<(THREE.Group | null)[]>([])

  useFrame(({ clock }) => {
    // Skip when the flower group is hidden (parent toggles visibility past page 2.7)
    if (animState.visualPage > 2.7) return
    const t = clock.elapsedTime
    for (let i = 0; i < configs.length; i++) {
      const ref = innerRefs.current[i]
      if (!ref) continue
      const cfg = configs[i]

      const sway = Math.sin(t * 0.5 + i * 1.31) * 0.05
      const sway2 = Math.cos(t * 0.7 + i * 0.73) * 0.04
      ref.rotation.x = -cfg.tilt + sway
      ref.rotation.z = cfg.roll + sway2
    }
  })

  return (
    <group>
      {configs.map((c, i) => {
        const asset = assets[c.variant]
        return (
          <group key={i} rotation={[0, c.azimuth, 0]}>
            <group
              ref={(el) => {
                innerRefs.current[i] = el
              }}
              rotation={[-c.tilt, 0, c.roll]}
            >
              <mesh geometry={asset.geo}>
                <meshBasicMaterial color="#3a0006" toneMapped={false} />
              </mesh>
              <mesh position={[asset.tip.x, asset.tip.y, asset.tip.z]}>
                <sphereGeometry args={[STAMEN_TIP_RADIUS, 8, 8]} />
                <meshBasicMaterial color="#8a0010" toneMapped={false} />
              </mesh>
            </group>
          </group>
        )
      })}
    </group>
  )
}

function Stem() {
  return (
    <mesh position={[0, -1.0, 0]}>
      <cylinderGeometry args={[0.008, 0.012, 1.85, 8]} />
      <meshBasicMaterial color="#4a0008" toneMapped={false} />
    </mesh>
  )
}

export function LycorisFlower() {
  const groupRef = useRef<THREE.Group>(null)
  const petalMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([])

  const petalGeometry = useMemo(() => buildPetalGeometry(), [])

  const stamenAssets = useMemo<StamenAsset[]>(
    () => [
      buildStamenAsset(1.75, 0.7, 0.4, 0.0022),
      buildStamenAsset(2.0, 0.85, 0.55, 0.002),
      buildStamenAsset(1.55, 0.6, 0.3, 0.0023),
      buildStamenAsset(2.2, 0.8, 0.65, 0.0019),
      buildStamenAsset(1.65, 1.0, 0.45, 0.0022),
      buildStamenAsset(1.9, 0.65, 0.5, 0.0021),
    ],
    [],
  )

  const petalConfigs = useMemo<PetalConfig[]>(() => {
    const r = makeRng(42)
    const arr: PetalConfig[] = []
    for (let i = 0; i < PETAL_COUNT; i++) {
      arr.push({
        azimuth: (i / PETAL_COUNT) * Math.PI * 2 + (r() - 0.5) * 0.55,
        tilt: 0.2 + r() * 1.55,
        roll: (r() - 0.5) * 0.5,
        scale: 0.8 + r() * 0.5,
        phase: r(),
      })
    }
    return arr
  }, [])

  const stamenConfigs = useMemo<StamenConfig[]>(() => {
    const r = makeRng(91)
    const arr: StamenConfig[] = []
    for (let i = 0; i < STAMEN_COUNT; i++) {
      arr.push({
        azimuth: r() * Math.PI * 2,
        tilt: 0.12 + r() * 1.4,
        roll: (r() - 0.5) * 0.9,
        variant: Math.floor(r() * stamenAssets.length),
        phase: r(),
      })
    }
    return arr
  }, [stamenAssets.length])

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const vPage = animState.visualPage

    // Skip the whole flower (geometry + animation) once it's offscreen on page 3+
    if (vPage > 2.7) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true

    const t = clock.elapsedTime
    const act = animState.activity

    // Idle sway always present
    const idleZ = Math.sin(t * 0.32) * 0.025
    const idleX = Math.sin(t * 0.24 + 1.0) * 0.018

    // Spin: noticeably faster base + gentle bell-curve during transition
    const spinSpeed = 0.55 + act * 4.5
    groupRef.current.rotation.y += spinSpeed * delta

    // Subtle transition tilt
    const transitionTilt = act * 0.22
    groupRef.current.rotation.z = idleZ + transitionTilt
    groupRef.current.rotation.x = idleX

    // Smooth scale fade across the entire 2→3 transition, fully gone on page 3
    const scale = 1 - smoothstep(2.0, 3.0, vPage)
    groupRef.current.scale.setScalar(scale)

    // Update all petals in a single loop (was 30 separate useFrames before)
    const pageFade = 1 - smoothstep(1.4, 2.0, vPage)
    const hoverTarget = hoverState.flower * pageFade
    const dampFactor = 1 - Math.exp(-5 * delta)
    const refs = petalMatRefs.current
    for (let i = 0; i < refs.length; i++) {
      const mat = refs[i]
      if (!mat) continue
      const phase = petalConfigs[i].phase
      mat.uniforms.uTime.value = t
      mat.uniforms.uLift.value = computeLift(act, phase)
      const cur = mat.uniforms.uOpen.value as number
      mat.uniforms.uOpen.value = cur + (hoverTarget - cur) * dampFactor
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.3, 0]}>
      {/* Invisible hover target — large enough to encompass petals + stamens */}
      <mesh
        position={[0, 0.15, 0]}
        onPointerEnter={() => {
          hoverState.flower = 1
        }}
        onPointerLeave={() => {
          hoverState.flower = 0
        }}
      >
        <sphereGeometry args={[1.6, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {petalConfigs.map((cfg, i) => (
        <group key={`p${i}`} rotation={[0, cfg.azimuth, 0]}>
          <group rotation={[-cfg.tilt, 0, cfg.roll]}>
            <group scale={cfg.scale}>
              <Petal
                geometry={petalGeometry}
                phase={cfg.phase}
                matRef={(m) => {
                  petalMatRefs.current[i] = m
                }}
              />
            </group>
          </group>
        </group>
      ))}

      <Stamens configs={stamenConfigs} assets={stamenAssets} />

      <Stem />
    </group>
  )
}
