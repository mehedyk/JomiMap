// All values in square feet (base unit)
// Tangail district standard: 1 Katha = 720 sq ft

export const UNITS = {
  sqft:    { sqft: 1 },
  sqm:     { sqft: 10.7639 },
  decimal: { sqft: 435.6 },    // 1 decimal = 435.6 sq ft
  katha:   { sqft: 720 },      // Tangail: 1 katha = 720 sq ft
  bigha:   { sqft: 14400 },    // Tangail: 1 bigha = 20 katha = 14,400 sq ft
  acre:    { sqft: 43560 },    // 1 acre = 43,560 sq ft
  hectare: { sqft: 107639.1 }, // 1 hectare = 107,639 sq ft
  sqkm:    { sqft: 10763910.4 },
} as const

export type UnitKey = keyof typeof UNITS

export interface UnitInfo {
  key: UnitKey
  en: string
  bn: string
  symbol: string
  sqft: number
}

export const UNIT_LIST: UnitInfo[] = [
  { key: 'sqft',    en: 'Square Feet',       bn: 'বর্গফুট',         symbol: 'ft²',  sqft: 1 },
  { key: 'sqm',     en: 'Square Meters',     bn: 'বর্গমিটার',       symbol: 'm²',   sqft: 10.7639 },
  { key: 'decimal', en: 'Decimal (Shotok)',  bn: 'শতক (ডেসিমাল)',  symbol: 'শতক',  sqft: 435.6 },
  { key: 'katha',   en: 'Katha',             bn: 'কাঠা',            symbol: 'কাঠা', sqft: 720 },
  { key: 'bigha',   en: 'Bigha',             bn: 'বিঘা',            symbol: 'বিঘা', sqft: 14400 },
  { key: 'acre',    en: 'Acre',              bn: 'একর',             symbol: 'একর',  sqft: 43560 },
  { key: 'hectare', en: 'Hectare',           bn: 'হেক্টর',          symbol: 'ha',   sqft: 107639.1 },
  { key: 'sqkm',    en: 'Square Kilometer',  bn: 'বর্গকিলোমিটার',  symbol: 'km²',  sqft: 10763910.4 },
]

export const CONVERSIONS = [
  { from: '1 Katha (কাঠা)',    to: '720 sq ft',           note: 'Tangail standard' },
  { from: '1 Bigha (বিঘা)',    to: '20 Katha = 14,400 sq ft', note: 'Tangail standard' },
  { from: '1 Decimal (শতক)',  to: '435.6 sq ft',         note: 'National standard' },
  { from: '1 Acre (একর)',      to: '100 Decimal = 43,560 sq ft', note: '' },
  { from: '1 Acre',            to: '3 Bigha 0.25 Katha (approx.)', note: 'Tangail' },
  { from: '1 Hectare (হেক্টর)', to: '2.471 Acres',       note: '' },
  { from: '1 Sq Km',           to: '100 Hectares',        note: '' },
]

export function sqftToAll(sqft: number): Record<UnitKey, number> {
  const result = {} as Record<UnitKey, number>
  for (const u of UNIT_LIST) {
    result[u.key] = sqft / u.sqft
  }
  return result
}

export function formatUnit(value: number, decimals = 4): string {
  if (value >= 1000) return value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  return value.toFixed(decimals).replace(/\.?0+$/, '')
}
