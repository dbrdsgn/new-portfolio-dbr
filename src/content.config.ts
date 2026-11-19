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
      /** Подзаголовок на карточке (главная и «Проекты»), над названием. Пустой — не показывается */
      subtitle: z.string().optional(),
      /** Ровно одна категория из src/data/categories.ts */
      category: z.enum(categorySlugs),
      /** ГГГГ-ММ: месяц нужен только для порядка, на сайте виден год */
      date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'дата пишется как ГГГГ-ММ, например 2023-05'),
      /** Обложка карточки на главной: <адрес>-cover.avif. У кейсов под NDA её нет */
      cover: image().optional(),
      /**
       * Только у кейсов под NDA: число, из которого генератор строит обложку.
       * Считается из настоящего названия: node scripts/nda-seed.ts "Название".
       * Само название в репозиторий не попадает
       */
      coverHash: z.number().int().nonnegative().optional(),
      /**
       * Обложка из генератора вместо файла <адрес>-cover: сид, как на /cover-generator.
       * Обычно — название кейса
       */
      coverSeed: z.string().optional(),
      /** Только для кейсов с одинаковой датой: меньше — выше. Без него — по имени папки */
      order: z.number().optional(),
      /** Убрать с сайта: страница открывается по прямой ссылке, но карточки нет */
      hidden: z.boolean().default(false),
    })
    .superRefine((data, ctx) => {
      if (data.category === 'nda' && data.coverHash === undefined) {
        ctx.addIssue({ code: 'custom', path: ['coverHash'], message: 'у кейса под NDA нужен coverHash: node scripts/nda-seed.ts "Название"' });
      }
      if (data.category !== 'nda' && !data.cover && !data.coverSeed) {
        ctx.addIssue({ code: 'custom', path: ['cover'], message: 'нет обложки: нужен файл <адрес>-cover или coverSeed для генератора' });
      }
      if (data.cover && data.coverSeed) {
        ctx.addIssue({ code: 'custom', path: ['coverSeed'], message: 'обложка или файлом, или из генератора (coverSeed), не обе сразу' });
      }
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
      /** Перевод подзаголовка кейса */
      subtitle: z.string().optional(),
      description: z.string().optional(),
      date: z.coerce.date().optional(),
      cover: image().optional(),
    }),
});

export const collections = { projects, articles, translations };
