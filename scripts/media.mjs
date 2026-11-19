// Сжимает исходники Дениса для сайта.
//
//   cases/<проект>/       → src/content/projects/<проект>/
//   knowledge/<статья>/   → src/content/articles/<статья>/
//
// Картинки (png, jpg, webp, avif) → AVIF шириной до 2800px, качество 80.
// GIF и видео (gif, mp4, mov, webm, mkv) → MP4 (H.264, до 1920px, без звука;
// звук остаётся только у файлов с меткой -sound в конце имени).
// Остальное (pdf, psd, md) пропускается.
//
// Запуск: npm run media            — все папки
//         npm run media -- era     — только папки с таким именем
// Уже сжатые файлы не пересчитываются, пока исходник не изменится.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = [
  { from: 'cases', to: 'src/content/projects' },
  { from: 'knowledge', to: 'src/content/articles' },
];
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const VIDEO = new Set(['.gif', '.mp4', '.mov', '.webm', '.mkv']);
/** 2800 — самая большая версия картинки на странице (big во всю ширину) */
const MAX_IMAGE_WIDTH = 2800;
/**
 * Качество AVIF. 4:4:4 — цвет не теряет чёткость на тонких линиях и цветном тексте.
 * effort 4: выше файл почти не уменьшается, а сжатие идёт в разы дольше.
 */
const AVIF = { quality: 80, effort: 4, chromaSubsampling: '4:4:4' };
const MAX_VIDEO_WIDTH = 1920;
/**
 * Кейсы под NDA (Категория: Эндиэй или nda): картинки и видео размываются уже в файле,
 * чёткий оригинал на сайт не попадает. Сила размытия — доля ширины готового файла:
 * 0.01 = радиус размытия 1% ширины (28 px у картинки 2800 px).
 * Зерно поверх кладёт сайт, см. .project-gallery[data-nda] в src/styles/site.css
 */
const NDA_BLUR = 0.01;

/** Кейс под NDA: в .md исходника категория «Эндиэй» или «nda» */
function isNdaFolder(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .some((f) => /^Категория:\s*(nda|эндиэй)\s*$/im.test(fs.readFileSync(path.join(dir, f), 'utf8')));
}

const only = process.argv.slice(2);

/** ffmpeg: из PATH, иначе из папки, куда его ставит winget */
function findFfmpeg() {
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const pkgs = path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
  if (fs.existsSync(pkgs)) {
    for (const dir of fs.readdirSync(pkgs).filter((d) => d.startsWith('Gyan.FFmpeg'))) {
      for (const build of fs.readdirSync(path.join(pkgs, dir))) {
        const exe = path.join(pkgs, dir, build, 'bin', 'ffmpeg.exe');
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

/** Готовый файл новее исходника — пропускаем */
const upToDate = (src, dst) => fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs;

const kb = (file) => Math.round(fs.statSync(file).size / 1024);

async function image(src, dst, nda) {
  let pipeline = sharp(src, { animated: false })
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true });
  if (nda) {
    const { width } = await sharp(src).metadata();
    // Размытие идёт после уменьшения, поэтому считается от ширины готового файла
    pipeline = pipeline.blur(Math.max(1, Math.min(width, MAX_IMAGE_WIDTH) * NDA_BLUR));
  }
  await pipeline.avif(AVIF).toFile(dst);
}

function video(ffmpeg, src, dst, sound, nda) {
  // У видео ширина заранее неизвестна, размытие считаем от предельной ширины
  const blur = nda ? `,gblur=sigma=${(MAX_VIDEO_WIDTH * NDA_BLUR).toFixed(1)}` : '';
  execFileSync(
    ffmpeg,
    [
      '-y', '-loglevel', 'error',
      '-i', src,
      ...(sound ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
      '-vf', `scale='min(${MAX_VIDEO_WIDTH},iw)':-2:flags=lanczos${blur},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
      '-movflags', '+faststart',
      dst,
    ],
    { stdio: 'inherit' },
  );
}

let ffmpeg;
let done = 0;
let skipped = 0;

for (const { from, to } of SOURCES) {
  const srcRoot = path.join(ROOT, from);
  if (!fs.existsSync(srcRoot)) continue;

  for (const folder of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    if (!folder.isDirectory() || folder.name === 'NDA') continue;
    if (only.length && !only.includes(folder.name)) continue;

    const outDir = path.join(ROOT, to, folder.name);
    const nda = isNdaFolder(path.join(srcRoot, folder.name));
    for (const file of fs.readdirSync(path.join(srcRoot, folder.name)).sort()) {
      const ext = path.extname(file).toLowerCase();
      const name = path.basename(file, path.extname(file));
      const src = path.join(srcRoot, folder.name, file);
      const label = `${from}/${folder.name}/${file}`;

      if (IMAGE.has(ext)) {
        const dst = path.join(outDir, `${name}.avif`);
        if (upToDate(src, dst)) { skipped++; continue; }
        fs.mkdirSync(outDir, { recursive: true });
        await image(src, dst, nda);
        console.log(`${label} → ${name}.avif  ${kb(src)} → ${kb(dst)} КБ${nda ? ', размыто (NDA)' : ''}`);
        done++;
      } else if (VIDEO.has(ext)) {
        const dst = path.join(outDir, `${name}.mp4`);
        if (upToDate(src, dst)) { skipped++; continue; }
        ffmpeg ??= findFfmpeg();
        if (!ffmpeg) {
          console.error(`Не найден ffmpeg — пропускаю ${label}. Установка: winget install Gyan.FFmpeg`);
          continue;
        }
        fs.mkdirSync(outDir, { recursive: true });
        video(ffmpeg, src, dst, name.endsWith('-sound'), nda);
        console.log(`${label} → ${name}.mp4  ${kb(src)} → ${kb(dst)} КБ${nda ? ', размыто (NDA)' : ''}`);
        done++;
      }
    }
  }
}

console.log(`Готово: сжато ${done}, без изменений ${skipped}.`);
