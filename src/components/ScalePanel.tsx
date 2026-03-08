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

type MapUnit  = 'inches' | 'cm' | 'mm'
type RealUnit = 'miles' | 'km' | 'feet' | 'meters'
type PanelMode = 'default' | 'manual' | 'manual-open' | 'calibrate'

export default function ScalePanel({
  scale, onScaleSet, onStartCalibrate, onCancelCalibrate,
  calibrateActive, calibratePxDist,
}: Props) {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  const [mode, setMode]                           = useState<PanelMode>('default')
  const [mapVal, setMapVal]                       = useState('16')
  const [mapUnit, setMapUnit]                     = useState<MapUnit>('inches')
  const [realVal, setRealVal]                     = useState('1')
  const [realUnit, setRealUnit]                   = useState<RealUnit>('miles')
  const [calibrateReal, setCalibrateReal]         = useState('')
  const [calibrateRealUnit, setCalibrateRealUnit] = useState<RealUnit>('feet')
  const [screenDPI, setScreenDPI]                 = useState('96')

  const applyDefault = () => {
    const sc = parseManualScale(16, 'inches', 1, 'miles', parseFloat(screenDPI) || 96)
    onScaleSet({ ...sc, label: '16″ = 1 mile (default)', calibrated: false })
    setMode('default')
  }

  const applyManual = () => {
    const mv = parseFloat(mapVal), rv = parseFloat(realVal)
    if (!mv || !rv) return
    onScaleSet(parseManualScale(mv, mapUnit, rv, realUnit, parseFloat(screenDPI) || 96))
    setMode('manual')
  }

  const applyCalibrate = () => {
    if (!calibratePxDist) return
    const rv = parseFloat(calibrateReal); if (!rv) return
    const toFeet: Record<RealUnit, number> = { miles: 5280, km: 3280.84, feet: 1, meters: 3.28084 }
    onScaleSet(buildScale(calibratePxDist, rv * toFeet[calibrateRealUnit], `${rv} ${calibrateRealUnit} (calibrated)`))
    onCancelCalibrate(); setMode('calibrate')
  }

  const iSty = { background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }
  const iCls = 'w-full px-3 py-2 rounded text-sm outline-none border'
  const mBtn = (active: boolean) => ({
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? 'white' : 'var(--text-secondary)',
    border: '1px solid var(--border)',
  })

  return (
    <div className="card p-4 space-y-3">
      <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase font-mono tracking-widest">
        {t.measureScale}
      </p>

      {scale && (
        <div style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)' }}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono flex-wrap">
          <CheckCircle size={13} />
          <span className="truncate flex-1">{scale.label}</span>
          {!scale.calibrated && <span style={{ color: 'var(--text-muted)' }} className="italic shrink-0 text-xs">(DPI assumed)</span>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={applyDefault} style={mBtn(mode === 'default')}
          className="px-2 py-2 rounded text-xs font-medium transition-colors">
          16″=1mi
        </button>

        {/* Single onClick — bug fixed */}
        <button onClick={() => setMode(m => m === 'manual-open' ? 'default' : 'manual-open')}
          style={mBtn(mode === 'manual' || mode === 'manual-open')}
          className="px-2 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
          <Pencil size={11} />
          {isBengali ? 'কাস্টম' : 'Custom'}
        </button>

        <button onClick={() => calibrateActive ? onCancelCalibrate() : onStartCalibrate()}
          style={{ background: calibrateActive ? 'var(--accent-rust)' : mode === 'calibrate' ? 'var(--accent)' : 'var(--bg-secondary)', color: calibrateActive || mode === 'calibrate' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
          className="px-2 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
          <Crosshair size={11} />
          {calibrateActive ? (isBengali ? 'বাতিল' : 'Cancel') : (isBengali ? 'ক্যালিব্রেট' : 'Draw')}
        </button>
      </div>

      {mode === 'manual-open' && (
        <div className="space-y-2 pt-1 animate-slide-up">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            {isBengali ? 'স্ক্রিন DPI (মনিটর ৯৬, ফোন ১৫০+):' : 'Screen DPI (monitor: 96, phone: 150+):'}
          </p>
          <input type="number" value={screenDPI} onChange={e => setScreenDPI(e.target.value)}
            className={iCls} style={iSty} placeholder="96" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1">{isBengali ? 'ম্যাপে' : 'On map'}</p>
              <div className="flex gap-1">
                <input type="number" value={mapVal} onChange={e => setMapVal(e.target.value)} className={iCls} style={iSty} />
                <select value={mapUnit} onChange={e => setMapUnit(e.target.value as MapUnit)} className={iCls} style={{ ...iSty, cursor: 'pointer' }}>
                  <option value="inches">in</option><option value="cm">cm</option><option value="mm">mm</option>
                </select>
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1">{isBengali ? 'বাস্তবে' : 'Real world'}</p>
              <div className="flex gap-1">
                <input type="number" value={realVal} onChange={e => setRealVal(e.target.value)} className={iCls} style={iSty} />
                <select value={realUnit} onChange={e => setRealUnit(e.target.value as RealUnit)} className={iCls} style={{ ...iSty, cursor: 'pointer' }}>
                  <option value="miles">mi</option><option value="km">km</option>
                  <option value="feet">ft</option><option value="meters">m</option>
                </select>
              </div>
            </div>
          </div>
          <button onClick={applyManual} className="btn-primary w-full text-xs py-2">
            {isBengali ? 'স্কেল প্রয়োগ করুন' : 'Apply Scale'}
          </button>
        </div>
      )}

      {calibrateActive && (
        <div style={{ background: 'color-mix(in srgb, var(--accent-rust) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-rust) 25%, transparent)' }}
          className="rounded p-3 space-y-2 animate-slide-up">
          <p style={{ color: 'var(--accent-rust)' }} className={`text-xs font-medium ${isBengali ? 'font-bengali' : ''}`}>
            {calibratePxDist === null
              ? (isBengali ? '① ম্যাপে পরিচিত দূরত্বের উপর দুটি বিন্দুতে ক্লিক করুন' : '① Click 2 points over a known distance on the map')
              : (isBengali ? `✓ লাইন আঁকা (${Math.round(calibratePxDist)}px)। বাস্তব দূরত্ব:` : `✓ Line drawn (${Math.round(calibratePxDist)}px). Enter real distance:`)
            }
          </p>
          {calibratePxDist !== null && (
            <div className="flex gap-2">
              <input type="number" value={calibrateReal} onChange={e => setCalibrateReal(e.target.value)}
                placeholder="e.g. 500" className={iCls} style={iSty} />
              <select value={calibrateRealUnit} onChange={e => setCalibrateRealUnit(e.target.value as RealUnit)}
                className={iCls} style={{ ...iSty, cursor: 'pointer' }}>
                <option value="feet">ft</option><option value="meters">m</option>
                <option value="miles">mi</option><option value="km">km</option>
              </select>
              <button onClick={applyCalibrate} className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                {isBengali ? 'সেট' : 'Set'}
              </button>
            </div>
          )}
          <button onClick={onCancelCalibrate} className="btn-ghost text-xs flex items-center gap-1">
            <RotateCcw size={11} /> {isBengali ? 'রিসেট' : 'Reset'}
          </button>
        </div>
      )}
    </div>
  )
}
