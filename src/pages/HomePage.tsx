import { useNavigate } from 'react-router-dom'
import { MapPin, Layers, Ruler, FileDown } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function HomePage() {
  const { t, lang } = useApp()
  const navigate = useNavigate()
  const isBengali = lang === 'bn'

  const features = [
    { icon: <Layers size={22} />, title: t.homeFeature1Title, desc: t.homeFeature1Desc },
    { icon: <MapPin  size={22} />, title: t.homeFeature2Title, desc: t.homeFeature2Desc },
    { icon: <Ruler   size={22} />, title: t.homeFeature3Title, desc: t.homeFeature3Desc },
    { icon: <FileDown size={22} />, title: t.homeFeature4Title, desc: t.homeFeature4Desc },
  ]

  return (
    <main className="topo-bg min-h-screen flex flex-col">

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28 animate-fade-in">
        {/* Decorative top line */}
        <div className="flex items-center gap-3 mb-8">
          <div style={{ height: '1px', width: '40px', background: 'var(--border-strong)' }} />
          <span style={{ color: 'var(--accent)', fontSize: '0.7rem', letterSpacing: '0.15em' }}
                className="font-mono uppercase">
            v1.0 · Tangail Standard
          </span>
          <div style={{ height: '1px', width: '40px', background: 'var(--border-strong)' }} />
        </div>

        <h1
          style={{ color: 'var(--text-primary)', lineHeight: 1.15 }}
          className={`font-display text-4xl sm:text-5xl md:text-6xl font-bold max-w-3xl mb-5 ${isBengali ? 'font-bengali' : ''}`}
        >
          {t.homeHero}
        </h1>

        <p
          style={{ color: 'var(--text-secondary)' }}
          className={`text-lg sm:text-xl max-w-xl mb-10 leading-relaxed ${isBengali ? 'font-bengali' : ''}`}
        >
          {t.homeHeroSub}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/measure')} className="btn-primary text-base px-6 py-3">
            <MapPin size={18} />
            <span className={isBengali ? 'font-bengali' : ''}>{t.homeGetStarted}</span>
          </button>
          <button onClick={() => navigate('/units-guide')} className="btn-secondary text-base px-6 py-3">
            <span className={isBengali ? 'font-bengali' : ''}>{t.homeUnitsGuide}</span>
          </button>
        </div>

        {/* Scale badge */}
        <div
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}
          className="mt-10 px-4 py-2 rounded-full text-xs font-mono flex items-center gap-2"
        >
          <span style={{ color: 'var(--accent)' }}>⬤</span>
          Default scale: 16″ = 1 mile · টাঙ্গাইল মানদণ্ড
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 pb-20">
        <div
          style={{ borderTop: '1px solid var(--border)' }}
          className="pt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="card p-5 animate-slide-up group hover:border-c cursor-default"
              style={{ animationDelay: `${i * 80}ms`, borderColor: 'var(--border)' }}
            >
              <div
                style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors group-hover:bg-accent/20"
              >
                {f.icon}
              </div>
              <h3
                style={{ color: 'var(--text-primary)' }}
                className={`font-semibold text-sm mb-2 ${isBengali ? 'font-bengali' : ''}`}
              >
                {f.title}
              </h3>
              <p
                style={{ color: 'var(--text-muted)' }}
                className={`text-xs leading-relaxed ${isBengali ? 'font-bengali' : ''}`}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
