import { useState } from 'react'
import { Crosshair, Pencil, CheckCircle, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ScaleConfig } from '../utils/scale'
import { buildScale, parseManualScale } from '../utils/scale'

interface Props {
  scale: ScaleConfig | null
  onScaleSet: (s: ScaleConfig) => void
  onStartCalibrate: () => void
  onCancelCalibrate: () => void
  calibrateActive: boolean
  calibratePxDist: number | null
}

type MapUnit = 'inches' | 'cm' | 'mm'
type RealUnit = 'miles' | 'km' | 'feet' | 'meters'

export default function ScalePanel({
  scale, onScaleSet, onStartCalibrate, onCancelCalibrate,
  calibrateActive, calibratePxDist,
}: Props) {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  const [mode, setMode] = useState<'default' | 'manual' | 'calibrate'>('default')
  const [mapVal, setMapVal] = useState('16')
  const [mapUnit, setMapUnit] = useState<MapUnit>('inches')
  const [realVal, setRealVal] = useState('1')
  const [realUnit, setRealUnit] = useState<RealUnit>('miles')
  const [calibrateReal, setCalibrateReal] = useState('')
  const [calibrateRealUnit, setCalibrateRealUnit] = useState<RealUnit>('feet')
  const [screenDPI, setScreenDPI] = useState('96') // user-entered or detected

  const applyDefault = () => {
    // 16 inches = 1 mile @ 96 DPI → pixels per inch = 96
    // But user may have different DPI. We ask them.
    const dpi = parseFloat(screenDPI) || 96
    const sc = parseManualScale(16, 'inches', 1, 'miles', dpi)
    onScaleSet({ ...sc, label: '16″ = 1 mile (default)', calibrated: false })
    setMode('default')
  }

  const applyManual = () => {
    const mv = parseFloat(mapVal)
    const rv = parseFloat(realVal)
    if (!mv || !rv) return
    const dpi = parseFloat(screenDPI) || 96
    const sc = parseManualScale(mv, mapUnit, rv, realUnit, dpi)
    onScaleSet(sc)
    setMode('manual')
  }

  const applyCalibrate = () => {
    if (!calibratePxDist) return
    const rv = parseFloat(calibrateReal)
    if (!rv) return
    const realUnitToFeet: Record<RealUnit, number> = {
      miles: 5280, km: 3280.84, feet: 1, meters: 3.28084,
    }
    const realFeet = rv * realUnitToFeet[calibrateRealUnit]
    const sc = buildScale(calibratePxDist, realFeet, `${rv} ${calibrateRealUnit} (calibrated)`)
    onScaleSet(sc)
    onCancelCalibrate()
    setMode('calibrate')
  }

  const inputClass = `
    w-full px-3 py-2 rounded text-sm outline-none transition-colors
    border focus:border-[color:var(--accent)]
  `
  const inputStyle = {
    background: 'var(--bg-primary)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <div className="card p-4 space-y-3">
      <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase font-mono tracking-widest">
        {t.measureScale}
      </p>

      {/* Current scale badge */}
      {scale && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            color: 'var(--accent)',
          }}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono"
        >
          <CheckCircle size={13} />
          {scale.label}
          {!scale.calibrated && (
            <span style={{ color: 'var(--text-muted)' }} className="ml-auto italic">
              (screen DPI assumed)
            </span>
          )}
        </div>
      )}

      {/* Mode buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={applyDefault}
          style={{
            background: mode === 'default' ? 'var(--accent)' : 'var(--bg-secondary)',
            color: mode === 'default' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          className={`px-2 py-2 rounded text-xs font-medium transition-colors ${isBengali ? 'font-bengali' : ''}`}
        >
          {t.measureScaleDefault.split('(')[0].trim()}
        </button>

        <button
          onClick={() => setMode(m => m === 'manual-open' as never ? 'default' : 'manual-open' as never)}
          style={{
            background: mode === 'manual' ? 'var(--accent)' : 'var(--bg-secondary)',
            color: mode === 'manual' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          className={`px-2 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${isBengali ? 'font-bengali' : ''}`}
          onClick={() => setMode(m => m === ('manual-open' as typeof m) ? 'default' : ('manual-open' as typeof m))}
        >
          <Pencil size={11} />
          {t.measureScaleCustom}
        </button>

        <button
          onClick={() => {
            if (calibrateActive) {
              onCancelCalibrate()
            } else {
              onStartCalibrate()
            }
          }}
          style={{
            background: calibrateActive ? 'var(--accent-rust)' : mode === 'calibrate' ? 'var(--accent)' : 'var(--bg-secondary)',
            color: calibrateActive || mode === 'calibrate' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          className={`px-2 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${isBengali ? 'font-bengali' : ''}`}
        >
          <Crosshair size={11} />
          {calibrateActive ? 'Cancel' : t.measureScaleCalibrate}
        </button>
      </div>

      {/* Manual input */}
      {(mode as string) === 'manual-open' && (
        <div className="space-y-2 pt-1 animate-slide-up">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            Screen DPI (usually 96 for monitors, 150+ for phones):
          </p>
          <input
            type="number"
            value={screenDPI}
            onChange={e => setScreenDPI(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="96"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1">On map</p>
              <div className="flex gap-1">
                <input type="number" value={mapVal} onChange={e => setMapVal(e.target.value)}
                  className={inputClass} style={inputStyle} />
                <select value={mapUnit} onChange={e => setMapUnit(e.target.value as MapUnit)}
                  className={inputClass} style={selectStyle}>
                  <option value="inches">in</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1">Real world</p>
              <div className="flex gap-1">
                <input type="number" value={realVal} onChange={e => setRealVal(e.target.value)}
                  className={inputClass} style={inputStyle} />
                <select value={realUnit} onChange={e => setRealUnit(e.target.value as RealUnit)}
                  className={inputClass} style={selectStyle}>
                  <option value="miles">mi</option>
                  <option value="km">km</option>
                  <option value="feet">ft</option>
                  <option value="meters">m</option>
                </select>
              </div>
            </div>
          </div>
          <button onClick={applyManual} className="btn-primary w-full text-xs py-2">
            Apply Scale
          </button>
        </div>
      )}

      {/* Calibrate: draw line instructions */}
      {calibrateActive && (
        <div
          style={{ background: 'color-mix(in srgb, var(--accent-rust) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-rust) 25%, transparent)' }}
          className="rounded p-3 space-y-2 animate-slide-up"
        >
          <p style={{ color: 'var(--accent-rust)' }} className={`text-xs font-medium ${isBengali ? 'font-bengali' : ''}`}>
            {calibratePxDist === null
              ? '① Click two points on the map over a known distance'
              : `✓ Line drawn (${Math.round(calibratePxDist)}px). Enter the real distance:`}
          </p>
          {calibratePxDist !== null && (
            <div className="flex gap-2">
              <input
                type="number"
                value={calibrateReal}
                onChange={e => setCalibrateReal(e.target.value)}
                placeholder="e.g. 500"
                className={inputClass}
                style={inputStyle}
              />
              <select
                value={calibrateRealUnit}
                onChange={e => setCalibrateRealUnit(e.target.value as RealUnit)}
                className={inputClass}
                style={selectStyle}
              >
                <option value="feet">ft</option>
                <option value="meters">m</option>
                <option value="miles">mi</option>
                <option value="km">km</option>
              </select>
              <button onClick={applyCalibrate} className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                Set
              </button>
            </div>
          )}
          <button onClick={onCancelCalibrate} className="btn-ghost text-xs flex items-center gap-1">
            <RotateCcw size={11} /> Reset line
          </button>
        </div>
      )}
    </div>
  )
}
