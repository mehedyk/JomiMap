import { useState } from 'react'
import { Trash2, Ruler, Pentagon, FileDown, Loader2 } from 'lucide-react'
import type { Measurement } from '../hooks/useCanvasEngine'
import type { ScaleConfig } from '../utils/scale'
import { UNIT_LIST, sqftToAll, formatUnit } from '../utils/units'
import { exportPDFReport } from '../utils/export'
import { useApp } from '../context/AppContext'

interface Props {
  measurements: Measurement[]
  hasScale: boolean
  scale: ScaleConfig | null
  onRemove: (id: string) => void
  bgCanvasRef: React.RefObject<HTMLCanvasElement>
  fileName: string
}

export default function ResultsPanel({ measurements, hasScale, scale, onRemove, bgCanvasRef, fileName }: Props) {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async () => {
    if (!bgCanvasRef.current) return
    setExporting(true)
    setExportError(null)
    try {
      await exportPDFReport({
        mapCanvas: bgCanvasRef.current,
        measurements,
        scale,
        fileName,
        lang,
      })
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase font-mono tracking-widest">
          {t.measureResults}
        </p>
        {measurements.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: 'var(--accent)',
              color: 'white',
              opacity: exporting ? 0.7 : 1,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-opacity"
          >
            {exporting
              ? <Loader2 size={12} className="animate-spin" />
              : <FileDown size={12} />
            }
            <span className={isBengali ? 'font-bengali' : ''}>
              {exporting ? 'Generating...' : t.measureExport}
            </span>
          </button>
        )}
      </div>

      {exportError && (
        <div style={{ color: 'var(--accent-rust)', background: 'color-mix(in srgb, var(--accent-rust) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-rust) 20%, transparent)' }}
          className="rounded px-3 py-2 text-xs">
          {exportError}
        </div>
      )}

      {/* Empty state */}
      {measurements.length === 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          className="rounded-lg p-6 text-center text-sm">
          <p className={isBengali ? 'font-bengali' : ''}>{t.measureNoResults}</p>
          {!hasScale && (
            <p className="mt-2 text-xs" style={{ color: 'var(--accent-rust)' }}>
              ⚠ Set a scale above for accurate measurements
            </p>
          )}
        </div>
      )}

      {/* Measurement cards */}
      {measurements.map((m, idx) => (
        <div key={m.id} className="card overflow-hidden animate-slide-up">
          {/* Card header */}
          <div style={{
            background: m.type === 'area'
              ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))'
              : 'color-mix(in srgb, var(--accent-rust) 8%, var(--bg-secondary))',
            borderBottom: '1px solid var(--border)',
          }} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              {m.type === 'area'
                ? <Pentagon size={13} style={{ color: 'var(--accent)' }} />
                : <Ruler size={13} style={{ color: 'var(--accent-rust)' }} />
              }
              <span style={{ color: 'var(--text-primary)' }} className="text-xs font-semibold font-mono">
                #{idx + 1} — {m.type === 'area' ? (isBengali ? 'ক্ষেত্রফল' : 'Area') : (isBengali ? 'দূরত্ব' : 'Distance')}
              </span>
            </div>
            <button
              onClick={() => onRemove(m.id)}
              style={{ color: 'var(--text-muted)' }}
              className="hover:text-[color:var(--accent-rust)] transition-colors p-1 rounded"
              title="Remove"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Values */}
          <div className="px-4 py-3">
            {m.type === 'distance'
              ? <DistanceResult feet={m.realFeet} hasScale={hasScale} isBengali={isBengali} />
              : <AreaResult sqft={m.realSqFt} hasScale={hasScale} isBengali={isBengali} />
            }
          </div>
        </div>
      ))}
    </div>
  )
}

function DistanceResult({ feet, hasScale, isBengali }: { feet: number; hasScale: boolean; isBengali: boolean }) {
  if (!hasScale) return (
    <p style={{ color: 'var(--text-muted)' }} className="text-xs italic">
      {isBengali ? 'স্কেল সেট করুন' : 'Set scale to see real distances'}
    </p>
  )
  const rows = [
    { en: 'Feet',   bn: 'ফুট',    val: formatUnit(feet, 2) },
    { en: 'Meters', bn: 'মিটার',  val: formatUnit(feet * 0.3048, 2) },
    { en: 'Miles',  bn: 'মাইল',   val: formatUnit(feet / 5280, 5) },
    { en: 'Km',     bn: 'কিমি',   val: formatUnit(feet * 0.3048 / 1000, 5) },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(r => (
        <UnitCell key={r.en} label={isBengali ? r.bn : r.en} value={r.val} />
      ))}
    </div>
  )
}

function AreaResult({ sqft, hasScale, isBengali }: { sqft: number; hasScale: boolean; isBengali: boolean }) {
  if (!hasScale) return (
    <p style={{ color: 'var(--text-muted)' }} className="text-xs italic">
      {isBengali ? 'স্কেল সেট করুন' : 'Set scale to see real areas'}
    </p>
  )
  const all = sqftToAll(sqft)
  return (
    <div className="grid grid-cols-2 gap-2">
      {UNIT_LIST.map(u => (
        <UnitCell key={u.key} label={isBengali ? u.bn : u.en} value={formatUnit(all[u.key])} />
      ))}
    </div>
  )
}

function UnitCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-secondary)' }} className="rounded px-3 py-2">
      <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-0.5 font-bengali leading-tight">
        {label}
      </p>
      <p style={{ color: 'var(--text-primary)' }} className="text-sm font-mono font-semibold">
        {value}
      </p>
    </div>
  )
}
