import { useRef, useState, useCallback } from 'react'
import { Upload, FileImage, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { usePDFLoader } from '../hooks/usePDFLoader'
import { useCanvasEngine } from '../hooks/useCanvasEngine'
import Toolbar from '../components/Toolbar'
import ScalePanel from '../components/ScalePanel'
import PageNavigator from '../components/PageNavigator'
import ResultsPanel from '../components/ResultsPanel'
import type { ScaleConfig } from '../utils/scale'
import type { LoadStage } from '../hooks/usePDFLoader'

function stageLabel(stage: LoadStage, isBn: boolean): string {
  switch (stage) {
    case 'reading':   return isBn ? 'ফাইল পড়া হচ্ছে…'     : 'Reading file…'
    case 'parsing':   return isBn ? 'PDF প্রসেস হচ্ছে…'     : 'Processing PDF…'
    case 'rendering': return isBn ? 'ম্যাপ রেন্ডার হচ্ছে…' : 'Rendering map…'
    default:          return isBn ? 'লোড হচ্ছে…'            : 'Loading…'
  }
}

export default function MeasurePage() {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver]               = useState(false)
  const [scale, setScale]                     = useState<ScaleConfig | null>(null)
  const [calibrateActive, setCalibrateActive] = useState(false)
  const [zoom, setZoom]                       = useState(100)
  const [mobilePanel, setMobilePanel]         = useState(false)

  const { pdfState, loading, stage, error, loadFile, goToPage } = usePDFLoader()
  const engine = useCanvasEngine(scale, setZoom)

  const handleStartCalibrate = useCallback(() => {
    engine.setTool('calibrate'); engine.clearCalibrate(); setCalibrateActive(true)
  }, [engine])

  const handleCancelCalibrate = useCallback(() => {
    engine.clearCalibrate(); engine.setTool('pan'); setCalibrateActive(false)
  }, [engine])

  const handleFile = useCallback((file: File) => {
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) { alert(t.errorFileSize); return }
    if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) {
      alert(t.errorFileType); return
    }
    loadFile(file, (dataUrl, w, h) => engine.loadImage(dataUrl, w, h))
  }, [loadFile, engine, t])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [handleFile])

  const handlePageChange = useCallback((page: number) => {
    goToPage(page, (dataUrl, w, h) => engine.loadImage(dataUrl, w, h))
  }, [goToPage, engine])

  const canvasCenter = () => {
    const c = engine.canvasRef.current; if (!c) return { x: window.innerWidth/2, y: window.innerHeight/2 }
    const r = c.getBoundingClientRect()
    return { x: r.left + r.width/2, y: r.top + r.height/2 }
  }

  const panelProps = {
    measurements: engine.measurements,
    hasScale:     scale !== null,
    scale,
    onRemove:     engine.removeById,
    bgCanvasRef:  engine.bgCanvasRef,
    fileName:     pdfState.fileName,
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)', background: 'var(--bg-primary)' }}>

      {/* ── Upload screen ──────────────────────────────────────── */}
      {!engine.imageLoaded && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in">
          <div className="max-w-lg w-full space-y-6">

            <div className="text-center">
              <p style={{ color: 'var(--accent)' }} className="font-mono text-xs uppercase tracking-widest mb-2">
                16″ = 1 mile · Tangail
              </p>
              <h1 style={{ color: 'var(--text-primary)' }}
                className={`font-display text-2xl font-bold ${isBengali ? 'font-bengali' : ''}`}>
                {t.navMeasure}
              </h1>
            </div>

            <div
              onClick={() => !loading && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: dragOver ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' : 'var(--bg-card)',
                cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
              className="rounded-xl p-12 flex flex-col items-center gap-4 text-center"
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
                  <p style={{ color: 'var(--accent)' }} className="font-mono text-xs tracking-widest uppercase animate-pulse">
                    {stageLabel(stage, isBengali)}
                  </p>
                  <div style={{ width: '160px', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px', background: 'var(--accent)',
                      width: stage === 'reading' ? '25%' : stage === 'parsing' ? '55%' : '80%',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ) : (
                <div style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center">
                  {dragOver ? <FileImage size={32} /> : <Upload size={32} />}
                </div>
              )}

              {!loading && (
                <>
                  <div>
                    <p style={{ color: 'var(--text-primary)' }}
                      className={`font-semibold text-lg mb-1 ${isBengali ? 'font-bengali' : ''}`}>
                      {t.measureUploadPrompt}
                    </p>
                    <p style={{ color: 'var(--text-muted)' }} className={`text-sm ${isBengali ? 'font-bengali' : ''}`}>
                      {t.measureUploadSub}
                    </p>
                  </div>
                  <button className="btn-primary"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
                    <span className={isBengali ? 'font-bengali' : ''}>{t.measureUploadBtn}</span>
                  </button>
                  <p style={{ color: 'var(--text-muted)' }} className={`text-xs ${isBengali ? 'font-bengali' : ''}`}>
                    {t.measureOrDrop}
                  </p>
                </>
              )}
            </div>

            {error && (
              <div style={{
                color: 'var(--accent-rust)',
                background: 'color-mix(in srgb, var(--accent-rust) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-rust) 25%, transparent)',
              }} className="rounded-lg px-4 py-3 text-sm">{error}</div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp"
            className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {/* ── Workspace — always mounted so refs exist ─────────── */}
      <div className="flex flex-1 overflow-hidden"
        style={{ display: engine.imageLoaded ? 'flex' : 'none' }}>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Toolbar
            tool={engine.tool}
            onToolChange={engine.setTool}
            onUndo={engine.undo}
            onClear={engine.clearAll}
            onZoomIn={() => { const c = canvasCenter(); engine.zoomIn(c.x, c.y) }}
            onZoomOut={() => { const c = canvasCenter(); engine.zoomOut(c.x, c.y) }}
            calibrateActive={calibrateActive}
            onStartCalibrate={handleStartCalibrate}
          />

          <div
            className="flex-1 relative overflow-hidden select-none"
            style={{ background: 'var(--bg-secondary)', cursor: engine.tool === 'pan' ? 'grab' : 'none' }}
          >
            <canvas ref={engine.bgCanvasRef} style={{ display: 'none' }} />
            <canvas
              ref={engine.canvasRef}
              style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none', display: 'block' }}
              onWheel={engine.onWheel}
              onMouseDown={engine.onMouseDown}
              onMouseMove={engine.onMouseMove}
              onMouseUp={engine.onMouseUp}
              onMouseLeave={engine.onMouseLeave}
              onClick={engine.onMouseClick}
              onDoubleClick={engine.onDoubleClickCanvas}
              onTouchStart={engine.onTouchStart}
              onTouchMove={engine.onTouchMove}
              onTouchEnd={engine.onTouchEnd}
            />

            {loading && engine.imageLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
                <Loader2 size={28} className="animate-spin text-white" />
                <p className="text-white text-xs font-mono uppercase tracking-widest opacity-80">
                  {stageLabel(stage, isBengali)}
                </p>
              </div>
            )}

            {/* Space-to-pan hint */}
            {engine.imageLoaded && engine.tool !== 'pan' && (
              <div style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}
                className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1 rounded-full pointer-events-none hidden md:block">
                Hold <kbd style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '3px', padding: '0 4px', fontFamily: 'inherit' }}>Space</kbd> to pan
              </div>
            )}

            {/* File badge */}
            <div style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}
              className="absolute bottom-3 left-3 text-xs font-mono px-3 py-1.5 rounded-full flex items-center gap-2 max-w-[55%]">
              <span className="truncate">{pdfState.fileName}</span>
              <span style={{ opacity: 0.45 }}>·</span>
              <span className="shrink-0">{(pdfState.fileSize/1024/1024).toFixed(1)} MB</span>
              <button onClick={() => window.location.reload()} style={{ opacity: 0.55 }}
                className="hover:opacity-100 ml-1 transition-opacity shrink-0" title="Load different file">✕</button>
            </div>

            {/* Zoom badge */}
            <div style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)' }}
              className="absolute bottom-3 right-3 text-xs font-mono px-2.5 py-1.5 rounded-full">
              {zoom}%
            </div>
          </div>

          <PageNavigator pdfState={pdfState} loading={loading} onPageChange={handlePageChange} />
        </div>

        {/* Right panel — desktop */}
        <div style={{ width: '300px', minWidth: '260px', borderLeft: '1px solid var(--border)', background: 'var(--bg-primary)', overflowY: 'auto' }}
          className="flex-col gap-4 p-4 hidden md:flex">
          <ScalePanel scale={scale} onScaleSet={setScale}
            onStartCalibrate={handleStartCalibrate} onCancelCalibrate={handleCancelCalibrate}
            calibrateActive={calibrateActive} calibratePxDist={engine.getCalibratePxDistance()} />
          <ResultsPanel {...panelProps} />
        </div>
      </div>

      {/* ── Mobile bottom sheet ───────────────────────────────── */}
      {engine.imageLoaded && (
        <div className="md:hidden" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
          <button
            onClick={() => setMobilePanel(p => !p)}
            style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium"
          >
            <span className={isBengali ? 'font-bengali' : ''}>
              {isBengali
                ? `স্কেল ও ফলাফল${engine.measurements.length > 0 ? ` (${engine.measurements.length})` : ''}`
                : `Scale & Results${engine.measurements.length > 0 ? ` (${engine.measurements.length})` : ''}`}
            </span>
            {mobilePanel ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {mobilePanel && (
            <div style={{ maxHeight: '45vh', overflowY: 'auto' }} className="animate-slide-up">
              <div className="p-3 space-y-3">
                <ScalePanel scale={scale} onScaleSet={setScale}
                  onStartCalibrate={handleStartCalibrate} onCancelCalibrate={handleCancelCalibrate}
                  calibrateActive={calibrateActive} calibratePxDist={engine.getCalibratePxDistance()} />
                <ResultsPanel {...panelProps} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
