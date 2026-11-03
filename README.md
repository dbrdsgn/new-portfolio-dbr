# Портфолио Дениса Сивухина

Сайт-портфолио графического дизайнера. Собирается на [Astro](https://astro.build), дизайн-система — [IDS](https://intuition-tech.github.io/ids/) (MIT), шрифт — Geologica (OFL).

Предпросмотр: https://dbrdsgn.github.io/new-portfolio-dbr/ — обновляется сам после каждого пуша в `main`.

## Что где лежит

```
src/
  content/
    projects/<адрес>/   кейсы: index.md (рус), en.md (англ), сжатые картинки и видео
    articles/<адрес>/   статьи («Знания»), так же
    info/               материалы для страницы «Инфо»: о себе, контакты, фото
  pages/                адреса сайта: / и /en/, /projects/<адрес>/ и /en/projects/<адрес>/
  views/                шаблоны страниц — один на оба языка
  components/           шапка, подвал, карточка проекта
  layouts/              общий каркас страницы (<head>, шапка, подвал)
  data/categories.ts    категории проектов и их подписи
  i18n/ui.ts            тексты интерфейса на русском и английском
  styles/site.css       стили сайта поверх IDS
  styles/ids/           дизайн-система IDS, скопирована и правится под себя
scripts/media.mjs       сжатие исходников (npm run media)
cases/, knowledge/      исходники Дениса в полном размере — в Git не попадают
Постановка задачи.md    что делаем и зачем
Роли.md                 кто за что отвечает
```

## Как добавить проект

Подробно — в [src/content/projects/README.md](src/content/projects/README.md). Коротко:

1. Исходники (PNG, JPG, GIF, видео) — в `cases/<адрес>/`.
2. `npm run media` — сожмёт их в `src/content/projects/<адрес>/`: картинки в AVIF, GIF и видео в MP4.
3. Рядом — `index.md` с полями и русским текстом и `en.md` с английским.
4. Коммит и пуш в `main` — через пару минут проект на сайте.

## Команды

Нужен [Node.js](https://nodejs.org) и для видео — ffmpeg (`winget install Gyan.FFmpeg`).

| Команда | Что делает |
|---|---|
| `npm install` | Поставить зависимости (один раз после скачивания репозитория) |
| `npm run dev` | Предпросмотр на http://localhost:4321/, обновляется сам при правках |
| `npm run media` | Сжать новые исходники из `cases/` и `knowledge/` |
| `npm run build` | Собрать сайт в `dist/` — так же, как на GitHub |

## Как сайт попадает в интернет

`.github/workflows/deploy.yml`: при каждом пуше в `main` GitHub собирает сайт и публикует его на GitHub Pages. Там же Astro нарезает каждую картинку на несколько размеров, и браузер скачивает подходящий экрану. Боевой хостинг — Beget, домен denissivukhin.com — подключим позже.
