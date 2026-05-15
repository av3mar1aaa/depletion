import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { LycorisFlower } from './components/LycorisFlower'
import { KakuganEye } from './components/KakuganEye'
import { ParticleField } from './components/ParticleField'
import { Effects } from './components/Effects'
import { MouseParallax } from './components/MouseParallax'
import { ScrollCamera } from './components/ScrollCamera'
import { Centipedes } from './components/Centipede'
import { adaptive } from '../lib/adaptive'

export function HeroScene() {
  return (
    <Canvas dpr={[1, adaptive.dprMax]} gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 0.05, 5.0]} fov={42} />

      <color attach="background" args={['#000000']} />

      <MouseParallax>
        <LycorisFlower />
      </MouseParallax>
      <ParticleField />
      <Centipedes />
      <KakuganEye />

      <ScrollCamera />
      <Effects />
    </Canvas>
  )
}
