/**
 * Генератор обложек заметок: горизонтальные цветные полосы с градиентами между ними.
 *
 * Один и тот же сид всегда даёт одну и ту же обложку. Сид — название заметки
 * (или coverSeed из её шапки, если обложку подобрали вручную).
 *
 * Каждая полоса — это цвет, поставленный дважды: в начале и в конце полосы.
 * Между концом одной полосы и началом следующей — градиент. Так у полосы
 * есть своя ширина (width), а у перехода — своя (blend).
 *
 * При наведении обложка течёт: по ней идут общие волны, которые растягивают
 * и сжимают целые участки (соседние полосы движутся вместе), а следом идёт
 * волна цвета — полосы плавно перекрашиваются в другие цвета той же обложки.
 *
 * Все числа и палитра лежат в src/data/cover-settings.json — это настройки сайта.
 * Подкрутить и посмотреть их можно на странице /cover-generator.
 *
 * Этот файл работает и при сборке сайта (готовая картинка сразу в HTML),
 * и в браузере (оживание по наведению, страница /cover-generator).
 */
import defaults from '../data/cover-settings.json';

/**
 * Роль цвета подсказывает генератору, как его использовать:
 *   dark  — фон: широкие спокойные поля;
 *   color — основные цветные полосы;
 *   light — блики: узкие светлые полосы.
 */
export type CoverRole = 'dark' | 'color' | 'light';

export interface CoverColor {
  hex: string;
  role: CoverRole;
}

export interface CoverSettings {
  /** Сколько полос в обложке: от и до */
  bandsMin: number;
  bandsMax: number;
  /** Высота цветного пятна в условных единицах: от и до. Важны соотношения, обложка всегда заполняется целиком */
  widthMin: number;
  widthMax: number;
  /** Перекос в сторону узких полос: 1 — узких и широких поровну, больше — широкие встречаются реже */
  widthCurve: number;
  /** Во сколько раз тёмные полосы выше обычных, а светлые (блики) — ниже */
  darkScale: number;
  lightScale: number;
  /** Высота градиента между полосами в тех же единицах: от и до */
  blendMin: number;
  blendMax: number;
  /** Перекос в сторону коротких градиентов */
  blendCurve: number;
  /** Доля резких границ без градиента: 0 — нет, 1 — все */
  hardEdgeChance: number;
  /** Сколько цветных акцентов берёт одна обложка: от и до */
  accentsMin: number;
  accentsMax: number;
  /** Как часто встречается тёмный фон по сравнению с акцентами (у акцентов вес от 0,4 до 2) */
  baseWeight: number;
  /** Сила общих волн при наведении: насколько участки обложки растягиваются и сжимаются (0 — стоят на месте) */
  flowSwing: number;
  /** Сила собственного «дыхания» каждой полосы поверх общих волн */
  ownSwing: number;
  /** Насколько полосы перекрашиваются при наведении: 0 — цвета не меняются, 1 — полностью */
  colorShift: number;
  /** Скорость движения: 1 — обычная, 2 — вдвое быстрее */
  speed: number;
  /** Секунды: за сколько обложка «просыпается» и за сколько возвращается на место */
  wakeTime: number;
  returnTime: number;
  palette: CoverColor[];
}

/** Настройки сайта */
export const coverDefaults = defaults as CoverSettings;

const ROLES: CoverRole[] = ['dark', 'color', 'light'];

/**
 * Настройки из ненадёжного источника (сохранённые в браузере): всё, чего не хватает
 * или что записано неверно, берётся из настроек сайта
 */
export function normalizeSettings(raw: unknown): CoverSettings {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const result: Record<string, unknown> = { ...coverDefaults };
  for (const [key, fallback] of Object.entries(coverDefaults)) {
    const value = source[key];
    if (typeof fallback === 'number' && typeof value === 'number' && Number.isFinite(value)) result[key] = value;
  }
  const palette = (Array.isArray(source.palette) ? source.palette : coverDefaults.palette)
    .filter((c): c is CoverColor => /^#[0-9a-f]{6}$/i.test(c?.hex) && ROLES.includes(c?.role))
    .map(({ hex, role }) => ({ hex, role }));
  result.palette = palette.length >= 2 ? palette : coverDefaults.palette.map((c) => ({ ...c }));
  return result as unknown as CoverSettings;
}

/** Секунды, за которые волна проходит свой круг при скорости 1: большая волна, малая встречная, волна цвета */
const BIG_WAVE_PERIOD: [number, number] = [4.5, 6.5];
const SMALL_WAVE_PERIOD: [number, number] = [3, 4.5];
const COLOR_WAVE_PERIOD: [number, number] = [5, 7];

type Lab = [number, number, number];

interface Wave {
  /** Скорость, радиан в секунду */
  speed: number;
  phase: number;
}

/** Волна, бегущая вдоль обложки */
interface TravelWave extends Wave {
  /** Сколько гребней помещается на высоте обложки */
  crests: number;
  weight: number;
}

export interface CoverBand {
  color: string;
  /** Ширина цветного пятна, в условных единицах */
  width: number;
  /** Ширина градиента до следующей полосы, в условных единицах */
  blend: number;
  widthWaves: [Wave, Wave];
  blendWaves: [Wave, Wave];
  /** Где стоят середина пятна и середина перехода в покое: 0 — верх обложки, 1 — низ */
  at: number;
  blendAt: number;
  /** Цвет полосы и цвет, в который она перекрашивается при наведении (oklab) */
  lab: Lab;
  altLab: Lab;
}

export interface Cover {
  settings: CoverSettings;
  bands: CoverBand[];
  flow: TravelWave[];
  colorWave: TravelWave;
}

/** Строка → число (FNV-1a). Регистр и пробелы внутри важны, пробелы по краям — нет */
function hashSeed(seed: string): number {
  const text = seed.normalize('NFC').trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Случайные числа от 0 до 1, одинаковые для одного сида (mulberry32) */
function createRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Цвет: смешиваем в oklab, чтобы переходы были чистыми, без грязно-серого ---------- */

function hexToLab(hex: string): Lab {
  const value = parseInt(hex.slice(1), 16);
  const [r, g, b] = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** oklab → красный, зелёный, синий от 0 до 255 */
function labToRgb([L, a, b]: Lab): number[] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  });
}

const labToCss = (lab: Lab): string => `rgb(${labToRgb(lab).join(',')})`;

const mixLab = (from: Lab, to: Lab, t: number): Lab => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

/* ---------- Обложка из сида ---------- */

/** Пара «от и до», даже если их перепутали местами */
const range = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];

export function createCover(seed: string, settings: CoverSettings = coverDefaults): Cover {
  const palette = settings.palette.length >= 2 ? settings.palette : coverDefaults.palette;
  const [bandsMin, bandsMax] = range(Math.round(settings.bandsMin), Math.round(settings.bandsMax));
  const [accentsMin, accentsMax] = range(Math.round(settings.accentsMin), Math.round(settings.accentsMax));
  const [widthMin, widthMax] = range(settings.widthMin, settings.widthMax);
  const [blendMin, blendMax] = range(settings.blendMin, settings.blendMax);

  const hash = hashSeed(seed);
  const random = createRandom(hash);
  // Первые числа у похожих сидов похожи — пропускаем их
  for (let i = 0; i < 4; i++) random();

  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const wave = (minPeriod: number, maxPeriod: number): Wave => ({
    speed: (Math.PI * 2) / (minPeriod + random() * (maxPeriod - minPeriod)),
    phase: random() * Math.PI * 2,
  });

  const darks = palette.filter((c) => c.role === 'dark');
  const others = palette.filter((c) => c.role !== 'dark');

  // Настроение обложки: один тёмный фон и несколько акцентов, у каждого свой вес —
  // один-два акцента встречаются часто, остальные изредка
  const base = pick(darks.length ? darks : palette);
  const accentCount = accentsMin + Math.floor(random() * (accentsMax - accentsMin + 1));
  const shuffled = [...others];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const accents = shuffled.slice(0, accentCount);
  const pool: { color: CoverColor; weight: number }[] = [
    { color: base, weight: Math.max(0.01, settings.baseWeight) },
    ...accents.map((color) => ({ color, weight: 0.4 + random() * 1.6 })),
  ];

  const count = Math.max(2, bandsMin + Math.floor(random() * (bandsMax - bandsMin + 1)));
  const drafts: (Pick<CoverBand, 'color' | 'width' | 'blend' | 'widthWaves' | 'blendWaves'> & { source: CoverColor })[] = [];
  let previous: CoverColor | undefined;

  for (let i = 0; i < count; i++) {
    // Соседние полосы всегда разного цвета (если в обложке больше одного цвета)
    const different = pool.filter((p) => p.color !== previous);
    const options = different.length ? different : pool;
    let roll = random() * options.reduce((sum, p) => sum + p.weight, 0);
    let chosen = options[options.length - 1].color;
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) {
        chosen = option.color;
        break;
      }
    }
    previous = chosen;

    // При перекосе больше 1 большинство полос узкие, изредка попадаются широкие поля
    let width = widthMin + (widthMax - widthMin) * random() ** settings.widthCurve;
    if (chosen.role === 'dark') width *= settings.darkScale;
    if (chosen.role === 'light') width *= settings.lightScale;
    width = Math.max(0.01, width);

    // Часть переходов — резкие границы, остальные — мягкие градиенты
    const hard = random() < settings.hardEdgeChance;
    const blend = hard ? 0.05 : Math.max(0.05, blendMin + (blendMax - blendMin) * random() ** settings.blendCurve);

    drafts.push({
      source: chosen,
      color: chosen.hex,
      width,
      blend,
      widthWaves: [wave(2.5, 5), wave(4, 9)],
      blendWaves: [wave(2.5, 5), wave(4, 9)],
    });
  }

  // Всё, что касается движения, берётся из отдельного ряда случайных чисел:
  // настройки анимации можно менять, и обложки в покое от этого не изменятся
  const motion = createRandom(hash ^ 0x9e3779b9);
  for (let i = 0; i < 4; i++) motion();
  const between = ([min, max]: [number, number]) => min + motion() * (max - min);
  const turn = Math.PI * 2;

  // Во что перекрашиваются полосы. Тёмный фон уходит в другой тёмный, цветные полосы —
  // в другие акценты той же обложки: композиция «фон и полосы» при этом сохраняется
  const otherDarks = darks.filter((c) => c !== base);
  const altBase = otherDarks.length ? otherDarks[Math.floor(motion() * otherDarks.length)] : base;
  let previousAlt: CoverColor | undefined;
  const alts = drafts.map(({ source }) => {
    if (source === base) return (previousAlt = altBase);
    const options = accents.filter((c) => c !== source && c !== previousAlt);
    const alt = options.length ? options[Math.floor(motion() * options.length)] : source;
    return (previousAlt = alt);
  });

  // Где каждая полоса стоит в покое — от этого зависит, когда до неё дойдёт волна
  const total = drafts.reduce((sum, band, i) => sum + band.width + (i < count - 1 ? band.blend : 0), 0);
  let position = 0;
  const bands: CoverBand[] = drafts.map(({ source, ...band }, i) => {
    const at = (position + band.width / 2) / total;
    const blendAt = (position + band.width + band.blend / 2) / total;
    position += band.width + band.blend;
    return { ...band, at, blendAt, lab: hexToLab(source.hex), altLab: hexToLab(alts[i].hex) };
  });

  return {
    settings,
    bands,
    // Большая волна идёт вниз, малая — навстречу ей
    flow: [
      { crests: 0.6 + motion() * 0.6, speed: turn / between(BIG_WAVE_PERIOD), phase: motion() * turn, weight: 0.65 },
      { crests: 1.3 + motion() * 0.9, speed: -turn / between(SMALL_WAVE_PERIOD), phase: motion() * turn, weight: 0.35 },
    ],
    colorWave: { crests: 0.4 + motion() * 0.5, speed: turn / between(COLOR_WAVE_PERIOD), phase: motion() * turn, weight: 1 },
  };
}

/* ---------- Кадр обложки ---------- */

function swing(waves: [Wave, Wave], time: number): number {
  return (
    0.6 * Math.sin(waves[0].speed * time + waves[0].phase) +
    0.4 * Math.sin(waves[1].speed * time + waves[1].phase)
  );
}

/** Высота бегущей волны в точке at (0 — верх обложки, 1 — низ): от −1 до 1 */
function travel(wave: TravelWave, at: number, time: number): number {
  return wave.weight * Math.sin(Math.PI * 2 * wave.crests * at - wave.speed * time + wave.phase);
}

/** Полоса в кадре: цвет и где стоит её пятно, в процентах высоты обложки */
interface FrameBand {
  color: string;
  lab: Lab;
  start: number;
  end: number;
}

/**
 * Кадр обложки: все полосы с цветами и местами.
 *
 * time — секунды с начала оживания; amount — сила оживания от 0 до 1.
 * При amount = 0 получается исходная обложка, какое бы ни было время:
 * поэтому, убавляя amount до нуля, обложка плавно возвращается на место.
 */
function coverFrame(cover: Cover, time: number, amount: number): FrameBand[] {
  const { bands, flow, colorWave, settings } = cover;
  const widths: number[] = [];
  const blends: number[] = [];
  const frame: FrameBand[] = [];
  let total = 0;

  time *= settings.speed;
  const stretch = (at: number) => settings.flowSwing * flow.reduce((sum, wave) => sum + travel(wave, at, time), 0);

  bands.forEach((band, i) => {
    const isLast = i === bands.length - 1;
    let width = band.width;
    let blend = isLast ? 0 : band.blend;
    let color = band.color;
    let lab = band.lab;

    if (amount > 0) {
      // Переходы «дышат» на треть слабее пятен
      width *= Math.exp(amount * (stretch(band.at) + settings.ownSwing * swing(band.widthWaves, time)));
      blend *= Math.exp(amount * (stretch(band.blendAt) + settings.ownSwing * (2 / 3) * swing(band.blendWaves, time)));

      // Волна цвета: где она прошла, полоса целиком в новом цвете, между гребнями — в своём
      const crest = Math.min(1, Math.max(0, 0.5 + 1.2 * travel(colorWave, band.at, time)));
      const mix = amount * settings.colorShift * crest * crest * (3 - 2 * crest);
      if (mix > 0.002) {
        lab = mixLab(band.lab, band.altLab, mix);
        color = labToCss(lab);
      }
    }

    widths.push(width);
    blends.push(blend);
    frame.push({ color, lab, start: 0, end: 0 });
    total += width + blend;
  });

  const scale = 100 / total;
  let position = 0;
  frame.forEach((band, i) => {
    band.start = position;
    band.end = i === frame.length - 1 ? 100 : position + widths[i] * scale;
    position = band.end + blends[i] * scale;
  });

  return frame;
}

/** Точки градиента для CSS: «цвет начало% конец%, …». Про time и amount — см. coverFrame */
export function coverStops(cover: Cover, time = 0, amount = 0): string {
  return coverFrame(cover, time, amount)
    .map((band) => `${band.color} ${band.start.toFixed(2)}% ${band.end.toFixed(2)}%`)
    .join(', ');
}

/**
 * Тот же кадр точками: цвет каждой строки обложки сверху вниз (красный, зелёный, синий, непрозрачность).
 * Нужен, чтобы сохранить обложку картинкой, видео или GIF: цвета смешиваются так же, как в браузере
 */
export function coverPixels(cover: Cover, height: number, time = 0, amount = 0): Uint8ClampedArray {
  const frame = coverFrame(cover, time, amount);
  const pixels = new Uint8ClampedArray(height * 4);
  let i = 0;

  for (let y = 0; y < height; y++) {
    const at = ((y + 0.5) / height) * 100;
    while (i < frame.length - 1 && at >= frame[i + 1].start) i++;
    const band = frame[i];
    const next = frame[i + 1];
    // Внутри пятна — его цвет, между пятнами — градиент до следующей полосы
    const lab = at <= band.end || !next ? band.lab : mixLab(band.lab, next.lab, (at - band.end) / (next.start - band.end));
    pixels.set(labToRgb(lab), y * 4);
    pixels[y * 4 + 3] = 255;
  }

  return pixels;
}
