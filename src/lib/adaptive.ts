const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4
const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
const isLowEnd = isMobile || cores <= 4

export const adaptive = {
  particleCount: isLowEnd ? 1600 : 3500,
  blobDetail: isLowEnd ? 4 : 5,
  dprMax: isMobile ? 1.0 : 1.5,
  isMobile,
  isLowEnd,
}
