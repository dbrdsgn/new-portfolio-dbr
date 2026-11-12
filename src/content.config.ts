import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { categories } from './data/categories';

const categorySlugs = categories.map((c) => c.slug) as unknown as [string, ...string[]];

/**
 * Одна запись = одна папка: src/content/<коллекция>/<адрес>/index.md (русский) + en.md (английский)
 * + картинки и видео рядом. Имя папки — адрес страницы: era/ → /projects/era/ и /en/projects/era/
 */
const byFolder = (collection: string) =>
  glob({
    pattern: '*/index.md',
    base: `./src/content/${collection}`,
    generateId: ({ entry }) => entry.split('/')[0],
  });

const projects = defineCollection({
  loader: byFolder('projects'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Ровно одна категория из src/data/categories.ts */
      category: z.enum(categorySlugs),
      /** ГГГГ-ММ: месяц нужен только для порядка, на сайте виден год */
      date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'дата пишется как ГГГГ-ММ, например 2023-05'),
      /** Обложка карточки на главной: <адрес>-cover.avif */
      cover: image(),
      /** Только для кейсов с одинаковой датой: меньше — выше. Без него — по имени папки */
      order: z.number().optional(),
      /** Убрать с сайта: страница открывается по прямой ссылке, но карточки нет */
      hidden: z.boolean().default(false),
    }),
});

const articles = defineCollection({
  loader: byFolder('articles'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      cover: image().optional(),
      /**
       * Сид сгенерированной обложки. Без него обложка строится по названию (title).
       * Подбирается на странице /cover-generator
       */
      coverSeed: z.string().optional(),
      description: z.string().optional(),
      /** Где статья была опубликована впервые */
      source: z.url().optional(),
      hidden: z.boolean().default(false),
    }),
});

/**
 * Английские тексты: en.md рядом с index.md. Переводится заголовок и текст;
 * картинки, категория и порядок берутся из index.md. Без en.md английская
 * страница покажет русский текст.
 */
const translations = defineCollection({
  loader: glob({
    pattern: '*/*/en.md',
    base: './src/content',
    generateId: ({ entry }) => entry.split('/').slice(0, 2).join('/'),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      date: z.coerce.date().optional(),
      cover: image().optional(),
    }),
});

export const collections = { projects, articles, translations };
