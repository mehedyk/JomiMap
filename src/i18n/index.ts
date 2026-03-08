import { en } from './en'
import { bn } from './bn'

export type Lang = 'en' | 'bn'
export type Translations = typeof en

export const translations: Record<Lang, Translations> = { en, bn }

export { en, bn }
