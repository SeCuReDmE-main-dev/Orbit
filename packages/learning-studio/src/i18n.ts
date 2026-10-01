import type {Language} from '../../ui-preferences/src/index.js'
export const text = (language: Language, fr: string, en: string, es: string) => ({fr,en,es})[language]
