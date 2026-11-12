import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { localePath } from '../i18n/utils';

type Article = CollectionEntry<'articles'>;
type Translation = CollectionEntry<'translations'>;

/** Статья с текстами на нужном языке */
export interface LocalizedArticle {
  entry: Article;
  translation?: Translation;
  title: string;
  description?: string;
  url: string;
}

/** Статья на нужном языке: en.md, если есть, иначе index.md */
export async function localizeArticle(entry: Article, lang: Lang): Promise<LocalizedArticle> {
  const all = lang === 'en' ? await getCollection('translations') : [];
  const translation = all.find((t) => t.id === `articles/${entry.id}`);
  return {
    entry,
    translation,
    title: translation?.data.title ?? entry.data.title,
    description: translation?.data.description ?? entry.data.description,
    url: localePath(lang, `knowledge/${entry.id}`),
  };
}

/** Все видимые статьи, сначала новые */
export async function getArticles(lang: Lang): Promise<LocalizedArticle[]> {
  const articles = await getCollection('articles', (a) => !a.data.hidden);
  articles.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
  return Promise.all(articles.map((a) => localizeArticle(a, lang)));
}

/** Сид обложки: coverSeed из шапки статьи, иначе русское название — обложка одинаковая на обоих языках */
export const articleCoverSeed = (entry: Article) => entry.data.coverSeed ?? entry.data.title;

/** Текст статьи с картинками */
export function renderArticle(article: LocalizedArticle) {
  return render(article.translation ?? article.entry);
}

/** Дата под заголовком: «5 декабря 2024 г.» / «5 December 2024» */
export function articleDate(entry: Article, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(entry.data.date);
}

/** Пути для страниц статей (включая скрытые — они открываются по ссылке) */
export async function articlePaths() {
  const articles = await getCollection('articles');
  return articles.map((entry) => ({ params: { id: entry.id }, props: { entry } }));
}
