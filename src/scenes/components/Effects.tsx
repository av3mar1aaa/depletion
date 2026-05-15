import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { adaptive } from '../../lib/adaptive'

const CHROMATIC_OFFSET = new Vector2(0.0008, 0.0012)

export function Effects() {
  // On lower-end hardware skip chromatic aberration entirely — visual delta is
  // tiny, the GPU win is real.
  const passes = [
    <Bloom
      key="bloom"
      intensity={0.55}
      luminanceThreshold={0.22}
      luminanceSmoothing={0.85}
      mipmapBlur
    />,
  ]
  if (!adaptive.isLowEnd) {
    passes.push(
      <ChromaticAberration
        key="chroma"
        offset={CHROMATIC_OFFSET}
        radialModulation={false}
        modulationOffset={0}
      />,
    )
  }
  passes.push(<Vignette key="vignette" offset={0.2} darkness={0.7} eskil={false} />)
  return <EffectComposer>{passes}</EffectComposer>
}
