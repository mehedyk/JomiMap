import { useRef, useState } from 'react'
import { Upload, FileImage } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function MeasurePage() {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) { alert(t.errorFileSize); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { alert(t.errorFileType); return }
    // Full implementation in Zip 2
    alert(`File received: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)\n\nFull canvas measurement coming in Zip 2!`)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <main className="topo-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">

        {/* Header */}
        <div className="mb-8">
          <p style={{ color: 'var(--accent)' }} className="font-mono text-xs uppercase tracking-widest mb-2">
            Scale: 16″ = 1 mile (Tangail)
          </p>
          <h1
            style={{ color: 'var(--text-primary)' }}
            className={`font-display text-3xl font-bold ${isBengali ? 'font-bengali' : ''}`}
          >
            {t.navMeasure}
          </h1>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: dragOver
              ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))'
              : 'var(--bg-card)',
            transition: 'all 0.2s',
          }}
          className="rounded-xl p-14 flex flex-col items-center justify-center cursor-pointer text-center gap-4"
        >
          <div
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
          >
            {dragOver ? <FileImage size={32} /> : <Upload size={32} />}
          </div>

          <div>
            <p
              style={{ color: 'var(--text-primary)' }}
              className={`font-semibold text-lg mb-1 ${isBengali ? 'font-bengali' : ''}`}
            >
              {t.measureUploadPrompt}
            </p>
            <p
              style={{ color: 'var(--text-muted)' }}
              className={`text-sm ${isBengali ? 'font-bengali' : ''}`}
            >
              {t.measureUploadSub}
            </p>
          </div>

          <button className="btn-primary">
            <span className={isBengali ? 'font-bengali' : ''}>{t.measureUploadBtn}</span>
          </button>

          <p style={{ color: 'var(--text-muted)' }} className={`text-xs ${isBengali ? 'font-bengali' : ''}`}>
            {t.measureOrDrop}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {/* Coming soon notice */}
        <div
          style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          className="mt-6 rounded-lg px-5 py-4 text-sm text-center font-mono"
        >
          ⚙ Canvas measurement tools — Zip 2
        </div>
      </div>
    </main>
  )
}
