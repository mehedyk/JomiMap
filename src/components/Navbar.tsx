import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, Sun, Moon, BookOpen } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Theme } from '../context/AppContext'

const themeIcons: Record<Theme, JSX.Element> = {
  light: <Sun size={16} />,
  dark:  <Moon size={16} />,
  sepia: <BookOpen size={16} />,
}

const themeOrder: Theme[] = ['light', 'dark', 'sepia']

export default function Navbar() {
  const { t, lang, setLang, theme, setTheme } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  const nextTheme = () => {
    const idx = themeOrder.indexOf(theme)
    setTheme(themeOrder[(idx + 1) % themeOrder.length])
  }

  const isBengali = lang === 'bn'

  const navLinks = [
    { to: '/',            label: t.navHome },
    { to: '/measure',     label: t.navMeasure },
    { to: '/units-guide', label: t.navUnitsGuide },
    { to: '/credits',     label: t.navCredits },
  ]

  return (
    <nav
      style={{ background: 'var(--bg-nav)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
            <div
              style={{ background: 'var(--accent)', color: 'white' }}
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold font-mono"
            >
              জম
            </div>
            <span
              style={{ color: 'var(--text-nav)' }}
              className={`font-display font-semibold text-lg tracking-tight ${isBengali ? 'font-bengali' : ''}`}
            >
              {t.appName}
            </span>
          </NavLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--accent)' : 'rgba(240,232,216,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                })}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all hover:text-white ${isBengali ? 'font-bengali' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={nextTheme}
              title={`Theme: ${theme}`}
              style={{ color: 'rgba(240,232,216,0.7)' }}
              className="p-2 rounded hover:bg-white/10 transition-colors"
            >
              {themeIcons[theme]}
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              style={{ color: 'rgba(240,232,216,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
              className="px-2.5 py-1 rounded text-xs font-medium hover:bg-white/10 transition-colors font-bengali"
            >
              {t.langToggle}
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ color: 'rgba(240,232,216,0.7)' }}
              className="md:hidden p-2 rounded hover:bg-white/10 transition-colors ml-1"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{ background: 'var(--bg-nav)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          className="md:hidden animate-fade-in"
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--accent)' : 'rgba(240,232,216,0.75)',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                })}
                className={`px-3 py-2.5 rounded text-sm font-medium transition-all ${isBengali ? 'font-bengali' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
