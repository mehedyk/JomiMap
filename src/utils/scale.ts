// Scale system
// Default: 16 inches = 1 mile
// Base: we work in pixels on canvas, convert to real-world feet

export interface ScaleConfig {
  // How many canvas pixels = realWorldFeet feet
  pixelsPerFoot: number
  // Human-readable label
  label: string
  // Was this calibrated via draw-to-calibrate?
  calibrated: boolean
}

// Default scale: 16 inches = 1 mile
// But we don't know DPI until calibrated. So default scale needs calibration.
// We store a "pending" state until user calibrates or enters manually.
export const DEFAULT_SCALE_LABEL = '16″ = 1 mile'

export function buildScale(
  pixelDistance: number,
  realWorldFeet: number,
  label?: string
): ScaleConfig {
  return {
    pixelsPerFoot: pixelDistance / realWorldFeet,
    label: label ?? `${pixelDistance}px = ${realWorldFeet} ft`,
    calibrated: true,
  }
}

// Convert pixel distance to feet
export function pixelsToFeet(pixels: number, scale: ScaleConfig): number {
  return pixels / scale.pixelsPerFoot
}

// Convert pixel area to square feet
// pixels here is in canvas pixel² — needs scale²
export function pixelAreaToSqFt(pixelArea: number, scale: ScaleConfig): number {
  return pixelArea / (scale.pixelsPerFoot * scale.pixelsPerFoot)
}

// Parse manual scale input like "16 inches = 1 mile"
// Returns feet per unit on right side
export function parseManualScale(
  mapValue: number,
  mapUnit: 'inches' | 'cm' | 'mm',
  realValue: number,
  realUnit: 'miles' | 'km' | 'feet' | 'meters',
  pixelsPerMapUnit: number // pixels per inch/cm/mm on screen — from DPI or calibration
): ScaleConfig {
  const mapUnitToInches: Record<string, number> = { inches: 1, cm: 0.3937, mm: 0.03937 }
  const realUnitToFeet: Record<string, number> = { miles: 5280, km: 3280.84, feet: 1, meters: 3.28084 }

  const mapInches = mapValue * mapUnitToInches[mapUnit]
  const realFeet = realValue * realUnitToFeet[realUnit]
  const pixelsForMapPart = mapInches * pixelsPerMapUnit

  return {
    pixelsPerFoot: pixelsForMapPart / realFeet,
    label: `${mapValue} ${mapUnit} = ${realValue} ${realUnit}`,
    calibrated: true,
  }
}

// Shoelace formula for polygon area in pixel²
export function polygonPixelArea(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

// Euclidean distance in pixels
export function pixelDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}
