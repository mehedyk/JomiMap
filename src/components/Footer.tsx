import { useApp } from '../context/AppContext'

export default function Footer() {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
      }}
      className="mt-auto"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">

          {/* Made by — English */}
          <p className="flex items-center gap-1.5">
            <span>{t.footerMadeBy}</span>
            <a
              href="https://github.com/mehedyk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
              className="font-semibold hover:underline underline-offset-2 transition-colors"
            >
              {lang === 'en' ? 'Mehedy' : ''}
            </a>
            {/* Bengali inline */}
            {lang === 'bn' && (
              <a
                href="https://github.com/mehedyk"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
                className="font-semibold font-bengali hover:underline underline-offset-2"
              >
                মেহেদী
              </a>
            )}
          </p>

          {/* Bilingual credit — always show both */}
          <p className="flex items-center gap-2 text-xs opacity-70">
            <span>Made by{' '}
              <a href="https://github.com/mehedyk" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }} className="hover:underline">Mehedy</a>
            </span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span className="font-bengali">বানিয়েছেন{' '}
              <a href="https://github.com/mehedyk" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }} className="hover:underline">মেহেদী</a>
            </span>
          </p>

          <p className={`text-xs opacity-60 ${isBengali ? 'font-bengali' : ''}`}>
            {t.footerRights}
          </p>
        </div>
      </div>
    </footer>
  )
}
