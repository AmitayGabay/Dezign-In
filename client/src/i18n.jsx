import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

const STORAGE_KEY = 'studio_language';
export const languages = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'he', label: 'עברית', dir: 'rtl' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (languages.some(({ code }) => code === saved)) return saved;
  } catch { /* Storage may be unavailable. */ }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(initialLanguage);
  const dir = languages.find(({ code }) => code === language)?.dir || 'ltr';

  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.title = translations[language]?.['Architecture & Interiors'] || 'Architecture & Interiors';
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      translations[language]?.['Thoughtful architecture and interior design, shaped around the way you live.']
      || 'Thoughtful architecture and interior design, shaped around the way you live.');
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Keep the in-memory choice. */ }
  }, [language, dir]);

  const value = useMemo(() => {
    const t = (key, values = {}) => {
      const template = translations[language]?.[key]
        || (/^Request failed \(\d+\)$/.test(key) ? translations[language]?.['Request failed ({status})']?.replace('{status}', key.match(/\d+/)[0]) : null)
        || key;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
    };
    return { language, setLanguage, dir, t, locale: { en: 'en-US', fr: 'fr-FR', he: 'he-IL', ru: 'ru-RU', ar: 'ar' }[language] };
  }, [language, dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is missing.');
  return context;
}
