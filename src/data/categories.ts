import type { Lang } from '../i18n/ui';

/**
 * Теги на странице «Проекты». Каждый тег объединяет несколько категорий.
 * Порядок здесь = порядок в строке тегов. Тег без проектов не показывается.
 */
export const tags = [
  { slug: 'web', label: { ru: 'Веб', en: 'Web' } },
  { slug: 'graphics', label: { ru: 'Графика', en: 'Graphics' } },
  { slug: 'navigation', label: { ru: 'Навигация', en: 'Wayfinding' } },
] as const;

export type TagSlug = (typeof tags)[number]['slug'];

/**
 * Категории проектов. У проекта ровно одна, в index.md пишется slug: `category: branding`.
 * label — подпись категории на странице кейса,
 * tag — в какой тег на странице «Проекты» попадает категория.
 */
export const categories = [
  { slug: 'branding', tag: 'graphics', label: { ru: 'Брендинг', en: 'Branding' } },
  { slug: 'web', tag: 'web', label: { ru: 'Сайт', en: 'Website' } },
  { slug: 'packaging', tag: 'graphics', label: { ru: 'Упаковка', en: 'Packaging' } },
  { slug: 'presentations', tag: 'graphics', label: { ru: 'Презентации', en: 'Presentations' } },
  { slug: 'navigation', tag: 'navigation', label: { ru: 'Навигация', en: 'Wayfinding' } },
  { slug: 'logos', tag: 'graphics', label: { ru: 'Логотип', en: 'Logo' } },
] as const satisfies readonly { slug: string; tag: TagSlug; label: Record<Lang, string> }[];

export type CategorySlug = (typeof categories)[number]['slug'];

export function categoryLabel(slug: string, lang: Lang): string {
  return categories.find((c) => c.slug === slug)?.label[lang] ?? slug;
}

/** Тег, в который попадает категория */
export function categoryTag(slug: string): TagSlug | undefined {
  return categories.find((c) => c.slug === slug)?.tag;
}
