import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { localePath } from '../i18n/utils';

type Project = CollectionEntry<'projects'>;
type Translation = CollectionEntry<'translations'>;

/** Проект с текстами на нужном языке */
export interface LocalizedProject {
  entry: Project;
  translation?: Translation;
  title: string;
  /** Для поисковиков и превью ссылок: начало текста кейса */
  description: string;
  url: string;
}

async function translationsMap(): Promise<Map<string, Translation>> {
  const all = await getCollection('translations');
  return new Map(all.map((t) => [t.id, t]));
}

function localize(entry: Project, lang: Lang, tr?: Translation): LocalizedProject {
  const t = lang === 'en' ? tr : undefined;
  return {
    entry,
    translation: t,
    title: t?.data.title ?? entry.data.title,
    description: excerpt((t ?? entry).body ?? ''),
    url: localePath(lang, `projects/${entry.id}`),
  };
}

/** Год для тегов на странице: из даты ГГГГ-ММ */
export const projectYear = (entry: Project) => entry.data.date.slice(0, 4);

/** Порядок: сначала новые (по дате ГГГГ-ММ), при равной дате — по полю order, потом по имени папки */
function compare(a: Project, b: Project): number {
  return (
    b.data.date.localeCompare(a.data.date) ||
    (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
    a.id.localeCompare(b.id)
  );
}

/** Все видимые проекты по порядку. Все они стоят на главной */
export async function getProjects(lang: Lang): Promise<LocalizedProject[]> {
  const [projects, tr] = await Promise.all([getCollection('projects', (p) => !p.data.hidden), translationsMap()]);
  return projects.sort(compare).map((p) => localize(p, lang, tr.get(`projects/${p.id}`)));
}

export async function localizeProject(entry: Project, lang: Lang): Promise<LocalizedProject> {
  const tr = await translationsMap();
  return localize(entry, lang, tr.get(`projects/${entry.id}`));
}

/** Следующий проект по порядку, по кругу */
export async function getNextProject(current: Project, lang: Lang): Promise<LocalizedProject | undefined> {
  const all = await getProjects(lang);
  if (all.length < 2) return undefined;
  const i = all.findIndex((p) => p.entry.id === current.id);
  return all[(i + 1) % all.length];
}

/** Текст на нужном языке: en.md, если есть, иначе index.md */
export function renderLocalized(project: LocalizedProject) {
  return render(project.translation ?? project.entry);
}

/** Пути для страниц кейсов (включая скрытые — они открываются по ссылке) */
export async function projectPaths() {
  const projects = await getCollection('projects');
  return projects.map((entry) => ({ params: { id: entry.id }, props: { entry } }));
}

/* ---------- Текст кейса ---------- */

/** Пометка места текста между картинками в index.md и en.md: <!-- после 7 --> */
const AFTER = /<!--\s*после\s+(\d+)\s*-->/;

/**
 * Описание для поисковиков и превью ссылок: начало текста, до ~160 знаков, по границе предложения.
 * Если по границе предложения выходит слишком коротко (следующее предложение длинное) — режем по слову
 */
function excerpt(markdown: string, limit = 160, min = 80): string {
  const intro = markdown.split(AFTER)[0];
  const text = intro
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // ссылки → их текст
    .replace(/https?:\/\/\S+/g, '') // голые адреса в описании не нужны
    .replace(/[*_`#>]/g, '')
    .split(/\n\s*\n/) // абзацы
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    // Строка-подзаголовок без знака в конце, чтобы не слиплась со следующей
    .map((p) => (/[.!?…:;]["»]?$/.test(p) ? p : `${p}.`))
    .join(' ');
  if (text.length <= limit) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["»]?\s*/g) ?? [];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > limit) break;
    out += s;
  }
  if (out.trim().length >= min) return out.trim();
  // Целые предложения дают слишком короткое описание — режем по слову
  return text.slice(0, limit).replace(/\s+\S*$/, '').replace(/[.,:;—–-]+$/, '') + '…';
}

/**
 * Текст кейса, разрезанный пометками <!-- после N -->:
 * intro — над галереей, after — блоки, которые стоят после картинки номер N
 */
export function splitText(project: LocalizedProject): { intro: string; after: Map<number, string> } {
  const html = (project.translation ?? project.entry).rendered?.html ?? '';
  const parts = html.split(AFTER);
  const after = new Map<number, string>();
  for (let i = 1; i < parts.length; i += 2) after.set(Number(parts[i]), parts[i + 1].trim());
  return { intro: parts[0].trim(), after };
}

/* ---------- Галерея кейса ---------- */

// Все картинки и видео из папок кейсов. Astro сам сожмёт картинки и нарежет их под экраны
const images = import.meta.glob<{ default: ImageMetadata }>('../content/projects/*/*.avif', { eager: true });
const videos = import.meta.glob<string>('../content/projects/*/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const SIZES = ['big', 'half', 'third', 'fourth'] as const;
export type Size = (typeof SIZES)[number];

export type GalleryItem =
  | { kind: 'image'; number: number; size: Size; name: string; image: ImageMetadata }
  | { kind: 'video'; number: number; size: Size; name: string; src: string; poster: ImageMetadata; sound: boolean };

const fileName = (path: string) => path.split('/').pop()!;

/**
 * Галерея кейса = все картинки и видео из его папки по номерам.
 * Имя файла: <адрес>-<номер>-<размер>.avif, видео — .mp4 с постером <адрес>-<номер>-<размер>-poster.avif.
 * Видео со звуком: <адрес>-<номер>-<размер>-sound.mp4, постер без метки.
 * Обложка <адрес>-cover.avif в галерею не входит.
 * Имя не по правилам или видео без постера — сборка останавливается и называет файл.
 */
export function getGallery(id: string): GalleryItem[] {
  const prefix = `../content/projects/${id}/`;
  const name = new RegExp(`^${id}-(\\d+)-(${SIZES.join('|')})(-sound)?(-poster)?\\.(avif|mp4)$`);
  const parse = (path: string) => {
    const file = fileName(path);
    const m = file.match(name);
    if (!m) throw new Error(`[галерея] ${id}/${file}: имя не по правилам, нужно ${id}-<номер>-<размер>`);
    return { file, number: Number(m[1]), size: m[2] as Size, sound: Boolean(m[3]), poster: Boolean(m[4]) };
  };

  const items: GalleryItem[] = [];
  const posters = new Map<number, ImageMetadata>();
  for (const [path, mod] of Object.entries(images)) {
    if (!path.startsWith(prefix) || fileName(path) === `${id}-cover.avif`) continue;
    const f = parse(path);
    if (f.poster) posters.set(f.number, mod.default);
    else items.push({ kind: 'image', number: f.number, size: f.size, name: f.file, image: mod.default });
  }
  for (const [path, src] of Object.entries(videos)) {
    if (!path.startsWith(prefix)) continue;
    const f = parse(path);
    const poster = posters.get(f.number);
    if (!poster) throw new Error(`[галерея] ${id}/${f.file}: у видео нет постера ${id}-${f.number}-${f.size}-poster`);
    items.push({ kind: 'video', number: f.number, size: f.size, name: f.file, src, poster, sound: f.sound });
  }

  items.sort((a, b) => a.number - b.number);
  for (let i = 1; i < items.length; i++) {
    if (items[i].number === items[i - 1].number) {
      throw new Error(`[галерея] ${id}: номер ${items[i].number} повторяется (${items[i - 1].name}, ${items[i].name})`);
    }
  }
  return items;
}

/* ---------- Сетка картинок кейса ---------- */

/** Какую долю экрана занимает картинка: браузер по ней выбирает файл нужной ширины */
export const SIZES_ATTR: Record<Size, string> = {
  big: '100vw',
  half: '(width < 768px) 100vw, 50vw',
  third: '100vw',
  fourth: '100vw',
};

/** Пропорции картинки или постера видео */
function ratio(item: GalleryItem) {
  const img = item.kind === 'image' ? item.image : item.poster;
  return img.width / img.height;
}

const pixels = (item: GalleryItem) => {
  const img = item.kind === 'image' ? item.image : item.poster;
  return `${item.name} ${img.width}×${img.height}`;
};

/**
 * Проверка сетки по «Правилам кейса». Сборку не останавливает: Клод сообщает Денису, тот решает.
 * - внутри проекта только big и half;
 * - half идут парами: нечётное количество подряд — неполный ряд;
 * - у пары half одна пропорция;
 * - текст [после N] не разрывает пару.
 */
export function checkGallery(id: string, items: GalleryItem[], textAfter: Iterable<number>): string[] {
  const warnings: string[] = [];
  const pairs: GalleryItem[][] = [];
  let run: GalleryItem[] = [];
  const flush = () => {
    if (run.length % 2) warnings.push(`${id}: нечётное количество half подряд (${run.length}): ${run.map((i) => i.name).join(', ')}`);
    for (let i = 0; i < run.length; i += 2) pairs.push(run.slice(i, i + 2));
    run = [];
  };
  for (const item of items) {
    if (item.size === 'third' || item.size === 'fourth') {
      warnings.push(`${id}: размер ${item.size} внутри проекта не используется: ${item.name}`);
    }
    if (item.size === 'half') run.push(item);
    else flush();
  }
  flush();

  for (const pair of pairs) {
    // Разница больше 1% уже видна как ступенька внизу ряда
    if (pair.length === 2 && Math.abs(ratio(pair[0]) / ratio(pair[1]) - 1) > 0.01) {
      warnings.push(`${id}: разные пропорции у пары half: ${pair.map(pixels).join(', ')}`);
    }
  }
  for (const n of textAfter) {
    const pair = pairs.find((p) => p.length === 2 && p[0].number === n);
    if (pair) warnings.push(`${id}: текст [после ${n}] разрывает пару half: ${pair.map((i) => i.name).join(', ')}`);
  }
  return warnings;
}
