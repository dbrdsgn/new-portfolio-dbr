import { defineConfig } from 'astro/config';

// Боевой адрес — denissivukhin.com (домен ещё не куплен).
// Для GitHub Pages workflow передаёт SITE и BASE через переменные окружения:
// сайт там лежит в подпапке /new-portfolio-dbr/.
const site = process.env.SITE ?? 'https://denissivukhin.com';
const base = process.env.BASE ?? '/';

export default defineConfig({
  site,
  base,
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: {
      // Русский — без приставки (/), английский — /en/
      prefixDefaultLocale: false,
    },
  },
});
