import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Lang, Translations } from '../i18n'
import { translations } from '../i18n'

export type Theme = 'light' | 'dark' | 'sepia'

interface AppContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
  theme: Theme
  setTheme: (t: Theme) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('jomimap_lang') as Lang) || 'en'
  })
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('jomimap_theme') as Theme) || 'light'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('jomimap_lang', l)
    document.documentElement.lang = l === 'bn' ? 'bn' : 'en'
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('jomimap_theme', t)
  }

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark', 'sepia')
    root.classList.add(theme)
    root.setAttribute('data-theme', theme)
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en'
  }, [theme, lang])

  return (
    <AppContext.Provider value={{ lang, setLang, t: translations[lang], theme, setTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
