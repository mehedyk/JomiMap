import { Trash2, Ruler, Pentagon } from 'lucide-react'
import type { Measurement } from '../hooks/useCanvasEngine'
import { UNIT_LIST, sqftToAll, formatUnit } from '../utils/units'
import { useApp } from '../context/AppContext'

interface Props {
  measurements: Measurement[]
  hasScale: boolean
  onRemove: (id: string) => void
}

export default function ResultsPanel({ measurements, hasScale, onRemove }: Props) {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  if (measurements.length === 0) {
    return (
      <div
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        className="rounded-lg p-6 text-center text-sm"
      >
        <p className={isBengali ? 'font-bengali' : ''}>{t.measureNoResults}</p>
        {!hasScale && (
          <p className="mt-2 text-xs" style={{ color: 'var(--accent-rust)' }}>
            ⚠ Set a scale above for accurate measurements
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase font-mono tracking-widest">
        {t.measureResults}
      </p>

      {measurements.map((m, idx) => (
        <div key={m.id} className="card overflow-hidden">
          {/* Header */}
          <div
            style={{
              background: m.type === 'area'
                ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))'
                : 'color-mix(in srgb, var(--accent-rust) 8%, var(--bg-secondary))',
              borderBottom: '1px solid var(--border)',
            }}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <div className="flex items-center gap-2">
              {m.type === 'area'
                ? <Pentagon size={14} style={{ color: 'var(--accent)' }} />
                : <Ruler size={14} style={{ color: 'var(--accent-rust)' }} />
              }
              <span
                style={{ color: 'var(--text-primary)' }}
                className="text-xs font-semibold font-mono"
              >
                #{idx + 1} — {m.type === 'area' ? 'Area' : 'Distance'}
              </span>
            </div>
            <button
              onClick={() => onRemove(m.id)}
              style={{ color: 'var(--text-muted)' }}
              className="hover:text-[color:var(--accent-rust)] transition-colors p-1"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Values */}
          <div className="px-4 py-3">
            {m.type === 'distance' ? (
              <DistanceResult feet={m.realFeet} hasScale={hasScale} isBengali={isBengali} />
            ) : (
              <AreaResult sqft={m.realSqFt} hasScale={hasScale} isBengali={isBengali} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function DistanceResult({ feet, hasScale, isBengali }: { feet: number; hasScale: boolean; isBengali: boolean }) {
  if (!hasScale) return <p className="text-xs text-muted-c italic">Set scale to see real distances</p>

  const meters = feet * 0.3048
  const miles = feet / 5280
  const km = meters / 1000

  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'Feet', bn: 'ফুট', val: formatUnit(feet, 2) },
        { label: 'Meters', bn: 'মিটার', val: formatUnit(meters, 2) },
        { label: 'Miles', bn: 'মাইল', val: formatUnit(miles, 4) },
        { label: 'Km', bn: 'কিমি', val: formatUnit(km, 4) },
      ].map(row => (
        <div key={row.label} style={{ background: 'var(--bg-secondary)' }} className="rounded px-3 py-2">
          <p style={{ color: 'var(--text-muted)' }} className={`text-xs mb-0.5 ${isBengali ? 'font-bengali' : ''}`}>
            {isBengali ? row.bn : row.label}
          </p>
          <p style={{ color: 'var(--text-primary)' }} className="text-sm font-mono font-semibold">
            {row.val}
          </p>
        </div>
      ))}
    </div>
  )
}

function AreaResult({ sqft, hasScale, isBengali }: { sqft: number; hasScale: boolean; isBengali: boolean }) {
  if (!hasScale) return <p className="text-xs text-muted-c italic">Set scale to see real areas</p>

  const all = sqftToAll(sqft)

  return (
    <div className="grid grid-cols-2 gap-2">
      {UNIT_LIST.map(u => (
        <div key={u.key} style={{ background: 'var(--bg-secondary)' }} className="rounded px-3 py-2">
          <p style={{ color: 'var(--text-muted)' }} className={`text-xs mb-0.5 ${isBengali ? 'font-bengali' : ''}`}>
            {isBengali ? u.bn : u.en}
          </p>
          <p style={{ color: 'var(--text-primary)' }} className="text-sm font-mono font-semibold">
            {formatUnit(all[u.key])}
          </p>
        </div>
      ))}
    </div>
  )
}
