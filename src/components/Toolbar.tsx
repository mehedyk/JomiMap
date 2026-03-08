import { Hand, Ruler, Pentagon, Crosshair, Undo2, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import type { Tool } from '../hooks/useCanvasEngine'
import { useApp } from '../context/AppContext'

interface Props {
  tool: Tool
  onToolChange: (t: Tool) => void
  onUndo: () => void
  onClear: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  calibrateActive: boolean
  onStartCalibrate: () => void
}

interface ToolBtn {
  id: Tool
  icon: JSX.Element
  labelEn: string
  labelBn: string
}

const TOOLS: ToolBtn[] = [
  { id: 'pan',      icon: <Hand size={17} />,     labelEn: 'Pan',      labelBn: 'সরান' },
  { id: 'distance', icon: <Ruler size={17} />,    labelEn: 'Distance', labelBn: 'দূরত্ব' },
  { id: 'area',     icon: <Pentagon size={17} />, labelEn: 'Area',     labelBn: 'ক্ষেত্রফল' },
  { id: 'calibrate',icon: <Crosshair size={17} />,labelEn: 'Calibrate',labelBn: 'ক্যালিব্রেট' },
]

export default function Toolbar({
  tool, onToolChange, onUndo, onClear, onZoomIn, onZoomOut, calibrateActive, onStartCalibrate,
}: Props) {
  const { lang } = useApp()
  const isBengali = lang === 'bn'

  const btnBase = `
    flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium
    transition-all cursor-pointer border
  `

  return (
    <div
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
      className="flex flex-wrap items-center gap-1.5 px-3 py-2"
    >
      {/* Tool buttons */}
      {TOOLS.map(tb => (
        <button
          key={tb.id}
          onClick={() => {
            if (tb.id === 'calibrate') onStartCalibrate()
            else onToolChange(tb.id)
          }}
          style={{
            background: (tool === tb.id || (tb.id === 'calibrate' && calibrateActive))
              ? 'var(--accent)' : 'var(--bg-secondary)',
            color: (tool === tb.id || (tb.id === 'calibrate' && calibrateActive))
              ? 'white' : 'var(--text-secondary)',
            borderColor: (tool === tb.id || (tb.id === 'calibrate' && calibrateActive))
              ? 'var(--accent)' : 'var(--border)',
          }}
          className={btnBase}
          title={tb.labelEn}
        >
          {tb.icon}
          <span className={isBengali ? 'font-bengali' : ''}>
            {isBengali ? tb.labelBn : tb.labelEn}
          </span>
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} className="mx-1" />

      {/* Zoom */}
      <button onClick={onZoomIn} className="btn-ghost p-2.5" title="Zoom in">
        <ZoomIn size={17} />
      </button>
      <button onClick={onZoomOut} className="btn-ghost p-2.5" title="Zoom out">
        <ZoomOut size={17} />
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} className="mx-1 hidden sm:block" />

      {/* Actions */}
      <button onClick={onUndo} className="btn-ghost p-2.5 flex items-center gap-1.5 text-xs" title="Undo">
        <Undo2 size={15} />
        <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>Undo</span>
      </button>
      <button
        onClick={onClear}
        style={{ color: 'var(--accent-rust)' }}
        className="btn-ghost p-2.5 flex items-center gap-1.5 text-xs"
        title="Clear all"
      >
        <Trash2 size={15} />
        <span className="hidden sm:inline">Clear</span>
      </button>

      {/* Area hint */}
      {tool === 'area' && (
        <div
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', marginLeft: 'auto' }}
          className="text-xs px-3 py-1.5 rounded font-mono hidden md:block"
        >
          Double-click / tap to close polygon
        </div>
      )}
      {tool === 'distance' && (
        <div
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', marginLeft: 'auto' }}
          className="text-xs px-3 py-1.5 rounded font-mono hidden md:block"
        >
          Click 2 points to measure distance
        </div>
      )}
    </div>
  )
}
