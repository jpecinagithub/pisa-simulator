import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../i18n';
import { searchCountries } from '../../lib/oecd';
import type { CountryMeta } from '../../types/oecd';
import { flagEmoji } from './flags';

/** Autocomplete country search (EN + ES names, min 2 chars) → /country/:code */
export function CountrySearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results: CountryMeta[] =
    query.trim().length >= 2 ? searchCountries(query.trim()).slice(0, 8) : [];

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function go(code: string) {
    setOpen(false);
    setQuery('');
    setActive(-1);
    navigate(`/country/${code.toLowerCase()}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && results[active]) go(results[active].code);
      else if (results.length > 0) go(results[0].code);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <label htmlFor={`${listId}-input`} className="sr-only">
        {t('explorer.components.search.label')}
      </label>
      <div className="relative">
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={t('explorer.components.search.placeholder')}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border border-line bg-paper py-3 pl-11 pr-10 text-ink-900 shadow-sm placeholder:text-ink-400"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
        {query && (
          <button
            type="button"
            aria-label={t('explorer.components.search.clear')}
            onClick={() => {
              setQuery('');
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-900"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('explorer.components.search.label')}
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-line bg-paper py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-600">{t('explorer.components.search.noResults')}</li>
          ) : (
            results.map((c, i) => (
              <li key={c.code} role="option" id={`${listId}-opt-${i}`} aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => go(c.code)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                    i === active ? 'bg-mist text-navy-900' : 'text-ink-900'
                  }`}
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    {flagEmoji(c.flag)}
                  </span>
                  <span className="font-medium">{lang === 'es' ? c.nameEs : c.nameEn}</span>
                  {c.oecd && (
                    <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-navy-800">
                      OECD
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      <p className="mt-1.5 text-xs text-ink-400">{t('explorer.components.search.hint')}</p>
    </div>
  );
}
