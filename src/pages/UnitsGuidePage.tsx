import { useApp } from '../context/AppContext'
import { UNIT_LIST, CONVERSIONS, formatUnit } from '../utils/units'

export default function UnitsGuidePage() {
  const { t, lang } = useApp()
  const isBengali = lang === 'bn'

  return (
    <main className="topo-bg min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">

        {/* Header */}
        <div className="mb-10">
          <p style={{ color: 'var(--accent)' }} className="font-mono text-xs uppercase tracking-widest mb-3">
            Reference
          </p>
          <h1
            style={{ color: 'var(--text-primary)' }}
            className={`font-display text-3xl sm:text-4xl font-bold mb-3 ${isBengali ? 'font-bengali' : ''}`}
          >
            {t.unitsGuideTitle}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className={`text-base ${isBengali ? 'font-bengali' : ''}`}>
            {t.unitsGuideSub}
          </p>
        </div>

        {/* Units table */}
        <section className="card overflow-hidden mb-8">
          <div
            style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
            className="px-5 py-3"
          >
            <h2
              style={{ color: 'var(--text-primary)' }}
              className={`font-semibold text-sm ${isBengali ? 'font-bengali' : ''}`}
            >
              {t.unitsTableUnit} Reference
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {[t.unitsTableUnit, t.unitsTableBengali, t.unitsTableSqFt, t.unitsTableSqM].map((h, i) => (
                    <th
                      key={i}
                      style={{ color: 'var(--text-muted)' }}
                      className={`px-5 py-3 text-left font-medium text-xs uppercase tracking-wider ${isBengali ? 'font-bengali' : 'font-mono'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UNIT_LIST.map((u, i) => (
                  <tr
                    key={u.key}
                    style={{
                      borderBottom: i < UNIT_LIST.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-secondary) 40%, transparent)',
                    }}
                  >
                    <td style={{ color: 'var(--text-primary)' }} className="px-5 py-3.5 font-medium">
                      {u.en}
                    </td>
                    <td style={{ color: 'var(--accent)' }} className="px-5 py-3.5 font-bengali font-semibold">
                      {u.bn}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }} className="px-5 py-3.5 font-mono text-xs">
                      {formatUnit(u.sqft, 2)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }} className="px-5 py-3.5 font-mono text-xs">
                      {formatUnit(u.sqft / 10.7639, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Conversions */}
        <section className="card overflow-hidden mb-8">
          <div
            style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
            className="px-5 py-3"
          >
            <h2
              style={{ color: 'var(--text-primary)' }}
              className={`font-semibold text-sm ${isBengali ? 'font-bengali' : ''}`}
            >
              {t.unitsConversionsTitle}
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {CONVERSIONS.map((c, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3 flex-wrap">
                <span
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: 'var(--accent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)'
                  }}
                  className="font-bengali text-sm px-3 py-1 rounded-full font-medium"
                >
                  {c.from}
                </span>
                <span style={{ color: 'var(--text-muted)' }} className="font-mono text-sm">=</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-mono text-sm font-medium">
                  {c.to}
                </span>
                {c.note && (
                  <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-auto italic">
                    ({c.note})
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tangail note */}
        <div
          style={{ background: 'color-mix(in srgb, var(--accent-rust) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-rust) 25%, transparent)', color: 'var(--accent-rust)' }}
          className="rounded-lg px-5 py-4 text-sm"
        >
          <span className="font-semibold">⚠ </span>
          <span className={isBengali ? 'font-bengali' : ''}>{t.unitsTangailNote}</span>
        </div>
      </div>
    </main>
  )
}
