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
  description?: string;
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
    description: t?.data.description ?? entry.data.description,
    url: localePath(lang, `projects/${entry.id}`),
  };
}

/** Порядок: сначала новые (год), внутри года — по полю order, потом по имени папки */
function compare(a: Project, b: Project): number {
  return (
    b.data.year - a.data.year ||
    (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
    a.id.localeCompare(b.id)
  );
}

/** Все видимые проекты по порядку */
export async function getProjects(lang: Lang): Promise<LocalizedProject[]> {
  const [projects, tr] = await Promise.all([getCollection('projects', (p) => !p.data.hidden), translationsMap()]);
  return projects.sort(compare).map((p) => localize(p, lang, tr.get(`projects/${p.id}`)));
}

/** Проекты для главной: с флагом featured, а если таких нет — все */
export async function getHomeProjects(lang: Lang): Promise<LocalizedProject[]> {
  const all = await getProjects(lang);
  const featured = all.filter((p) => p.entry.data.featured);
  return featured.length ? featured : all;
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

/* ---------- Галерея кейса ---------- */

// Все картинки и видео из папок кейсов. Astro сам сожмёт картинки и нарежет их под экраны
const images = import.meta.glob<{ default: ImageMetadata }>('../content/projects/*/*.{avif,jpg,jpeg,png,webp}', {
  eager: true,
});
const videos = import.meta.glob<string>('../content/projects/*/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type GalleryItem =
  | { kind: 'image'; name: string; image: ImageMetadata }
  | { kind: 'video'; name: string; src: string };

/** Файлы с такими именами — только обложка, в галерею кейса не идут */
const COVER_ONLY = new Set(['preview', 'cover']);

const fileName = (path: string) => path.split('/').pop()!;
const baseName = (path: string) => fileName(path).replace(/\.[^.]+$/, '');

/**
 * Галерея кейса = все картинки и видео из его папки, по имени файла
 * (01, 02, 03…). Чтобы поменять порядок — переименовать файлы.
 */
export function getGallery(id: string): GalleryItem[] {
  const prefix = `../content/projects/${id}/`;
  const items: GalleryItem[] = [];
  for (const [path, mod] of Object.entries(images)) {
    if (path.startsWith(prefix) && !COVER_ONLY.has(baseName(path))) {
      items.push({ kind: 'image', name: fileName(path), image: mod.default });
    }
  }
  for (const [path, src] of Object.entries(videos)) {
    if (path.startsWith(prefix)) items.push({ kind: 'video', name: fileName(path), src });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
