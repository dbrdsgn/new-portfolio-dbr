import { getRelativeLocaleUrl } from 'astro:i18n';
import { ui, defaultLang, type Lang, type UiKey } from './ui';

/** Путь без базового пути сайта (на GitHub Pages сайт лежит в подпапке) */
function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
}

export function getLangFromUrl(url: URL): Lang {
  const [first] = stripBase(url.pathname).split('/').filter(Boolean);
  if (first && first in ui) return first as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return (key: UiKey): string => ui[lang][key] ?? ui[defaultLang][key];
}

/** Путь внутри языка с учётом базового пути: localePath('en', 'projects/era') → /en/projects/era/ */
export function localePath(lang: Lang, path = ''): string {
  return getRelativeLocaleUrl(lang, path);
}

/** Тот же адрес на другом языке — для переключателя RU/EN */
export function switchLangPath(url: URL, target: Lang): string {
  const parts = stripBase(url.pathname).split('/').filter(Boolean);
  if (parts[0] && parts[0] in ui) parts.shift();
  return getRelativeLocaleUrl(target, parts.join('/'));
}
