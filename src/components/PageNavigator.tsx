import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { PDFState } from '../hooks/usePDFLoader'

interface Props {
  pdfState: PDFState
  loading: boolean
  onPageChange: (page: number) => void
}

export default function PageNavigator({ pdfState, loading, onPageChange }: Props) {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  if (pdfState.type !== 'pdf' || pdfState.totalPages <= 1) return null

  const { currentPage, totalPages } = pdfState

  return (
    <div
      style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
      className="flex items-center justify-between px-4 py-2 text-sm"
    >
      <div style={{ color: 'var(--text-muted)' }} className="flex items-center gap-2 text-xs">
        <FileText size={13} />
        <span className={isBengali ? 'font-bengali' : ''}>
          {t.measurePage} {currentPage} {t.measureOf} {totalPages}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="btn-ghost p-1.5 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page number input */}
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={e => {
            const v = parseInt(e.target.value)
            if (v >= 1 && v <= totalPages) onPageChange(v)
          }}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            width: '48px',
            textAlign: 'center',
          }}
          className="rounded px-1 py-1 text-xs font-mono outline-none"
        />

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="btn-ghost p-1.5 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
