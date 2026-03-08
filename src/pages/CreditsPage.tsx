import { Github } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function CreditsPage() {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  return (
    <main className="topo-bg min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full animate-fade-in space-y-8">

        {/* Ayat card */}
        <div
          className="card p-8 sm:p-10 text-center"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          {/* Label */}
          <p
            style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}
            className={`text-xs uppercase font-mono mb-6 ${isBengali ? 'font-bengali' : ''}`}
          >
            {t.creditsAyatLabel}
          </p>

          {/* Arabic */}
          <p
            style={{ color: 'var(--text-primary)', lineHeight: 2.2, fontSize: '1.35rem' }}
            className="font-arabic mb-6 leading-loose"
            dir="rtl"
          >
            {t.creditsAyatArabic}
          </p>

          {/* Divider */}
          <div
            style={{ height: '1px', background: 'var(--border)', margin: '0 auto 1.5rem', width: '60px' }}
          />

          {/* Translation */}
          <p
            style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.8 }}
            className={`text-sm sm:text-base ${isBengali ? 'font-bengali' : ''}`}
          >
            {t.creditsAyatTranslation}
          </p>
        </div>

        {/* Made by */}
        <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-widest font-mono mb-2">
              Developer
            </p>
            <p style={{ color: 'var(--text-primary)' }} className="text-lg font-display font-semibold">
              {t.creditsMadeBy}{' '}
              <a
                href="https://github.com/mehedyk"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}
                className="hover:underline underline-offset-2"
              >
                {lang === 'en' ? t.creditsMadeByName : ''}
              </a>
              {lang === 'bn' && (
                <a
                  href="https://github.com/mehedyk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}
                  className="font-bengali hover:underline underline-offset-2 ml-1"
                >
                  {t.creditsMadeByName}
                </a>
              )}
            </p>
            {/* Always show both */}
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
              Made by <a href="https://github.com/mehedyk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} className="hover:underline">Mehedy</a>
              {' · '}
              <span className="font-bengali">বানিয়েছেন <a href="https://github.com/mehedyk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} className="hover:underline">মেহেদী</a></span>
            </p>
          </div>

          <a
            href="https://github.com/mehedyk/JomiMap"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Github size={16} />
            <span className={isBengali ? 'font-bengali' : ''}>{t.creditsViewGithub}</span>
          </a>
        </div>

        {/* Tech stack */}
        <div className="card p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-widest font-mono mb-4">
            {t.creditsTechStack}
          </p>
          <div className="flex flex-wrap gap-2">
            {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'PDF.js', 'Fabric.js', 'jsPDF'].map(tech => (
              <span
                key={tech}
                style={{
                  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)'
                }}
                className="px-3 py-1 rounded-full text-xs font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
