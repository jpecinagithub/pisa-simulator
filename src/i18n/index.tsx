import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LocalizedText } from '../types/simulator';
import { en } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';
const STORAGE_KEY = 'pisa-simulator:lang';

type Dict = Record<string, unknown>;

function lookup(dict: Dict, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Dict)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** translate a dotted key, e.g. t('nav.home'); falls back to English, then the key */
  t: (key: string) => string;
  /** pick the current language from a LocalizedText */
  tx: (v: LocalizedText) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s === 'es' ? 'es' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string) => {
      const dict = (lang === 'es' ? es : en) as unknown as Dict;
      return (
        lookup(dict, key) ??
        lookup(en as unknown as Dict, key) ??
        key
      );
    },
    [lang],
  );

  const tx = useCallback((v: LocalizedText) => v[lang] ?? v.en, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, tx }), [lang, setLang, t, tx]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
