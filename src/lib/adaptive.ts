const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4
const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
const isLowEnd = isMobile || cores <= 4

export const adaptive = {
  particleCount: isMobile ? 1100 : isLowEnd ? 1800 : 3500,
  blobDetail: isLowEnd ? 4 : 5,
  dprMax: isMobile ? 1.0 : 1.5,
  petalCount: isMobile ? 18 : 30,
  stamenCount: isMobile ? 32 : 56,
  // Maximum number of centipede decorations to render (the rest are skipped)
  centipedeLimit: isMobile ? 2 : 99,
  isMobile,
  isLowEnd,
}
