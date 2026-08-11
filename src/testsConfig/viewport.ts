export type Viewport = 'mobile' | 'tablet' | 'small-desktop' | 'desktop'

type ViewportDimensions = {
  width: number
  height: number
}

const VIEWPORTS: Record<Viewport, ViewportDimensions> = {
  mobile: { width: 428, height: 926 },
  tablet: { width: 810, height: 1080 },
  'small-desktop': { width: 1366, height: 768 },
  desktop: { width: 1920, height: 1080 },
}

export function setViewport(viewport: Viewport = 'mobile'): void {
  const { width, height } = VIEWPORTS[viewport]
  Object.defineProperty(globalThis, 'innerWidth', { writable: true, configurable: true, value: width })
  Object.defineProperty(globalThis, 'innerHeight', { writable: true, configurable: true, value: height })
  globalThis.dispatchEvent(new Event('resize'))
}

export function resetViewport(): void {
  setViewport('mobile')
}
