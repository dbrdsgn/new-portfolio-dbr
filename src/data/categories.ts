import type { Lang } from '../i18n/ui';

/**
 * Категории проектов. У проекта ровно одна, в index.md пишется slug: `category: branding`.
 * label — подпись категории (на странице кейса),
 * menu — как категория читается в плашке «Задизайнил [...]» / «Designed [...]».
 * Порядок здесь = порядок в списке плашки.
 */
export const categories = [
  { slug: 'branding', label: { ru: 'Брендинг', en: 'Branding' }, menu: { ru: 'брендинг', en: 'branding' } },
  { slug: 'web', label: { ru: 'Сайт', en: 'Website' }, menu: { ru: 'сайты', en: 'websites' } },
  { slug: 'packaging', label: { ru: 'Упаковка', en: 'Packaging' }, menu: { ru: 'упаковку', en: 'packaging' } },
  { slug: 'communications', label: { ru: 'Коммуникации', en: 'Communications' }, menu: { ru: 'коммуникации', en: 'communications' } },
  { slug: 'presentations', label: { ru: 'Презентации', en: 'Presentations' }, menu: { ru: 'презентации', en: 'presentations' } },
  { slug: 'navigation', label: { ru: 'Навигация', en: 'Wayfinding' }, menu: { ru: 'навигацию', en: 'wayfinding' } },
  { slug: 'logos', label: { ru: 'Логотип', en: 'Logo' }, menu: { ru: 'логотипы', en: 'logos' } },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

export function categoryLabel(slug: string, lang: Lang): string {
  return categories.find((c) => c.slug === slug)?.label[lang] ?? slug;
}
