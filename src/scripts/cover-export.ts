// Сохранение обложки файлом со страницы /cover-generator: картинка, видео и GIF.
// Всё собирается прямо в браузере, на сервер ничего не уходит.
//
// Видео и GIF — это одно наведение на обложку: она стоит, оживает, течёт
// и возвращается на место. Начало и конец совпадают, поэтому ролик зацикливается без шва.
import { coverPixels, type Cover } from '../lib/cover';

/** Размеры файлов по длинной стороне (высоте), в точках */
const IMAGE_HEIGHT = 2000;
const VIDEO_HEIGHT = 1200;
const GIF_HEIGHT = 560;

const VIDEO_FPS = 30;
const GIF_FPS = 20;

/** Секунды: сколько обложка стоит в начале и в конце ролика и сколько движется */
const REST_TIME = 0.4;
const ALIVE_TIME = 7;

export type Progress = (done: number) => void;

/** Сколько длится ролик и какая у обложки сила оживания в каждую его секунду */
function timeline(cover: Cover) {
  const wake = Math.max(0.01, cover.settings.wakeTime);
  const back = Math.max(0.01, cover.settings.returnTime);
  const duration = REST_TIME + ALIVE_TIME + back + REST_TIME;

  /** Время движения и сила оживания (с плавным разгоном и торможением) в секунду t ролика */
  const at = (t: number) => {
    const time = Math.min(Math.max(0, t - REST_TIME), ALIVE_TIME + back);
    const amount = time < ALIVE_TIME ? Math.min(1, time / wake) : Math.max(0, 1 - (time - ALIVE_TIME) / back);
    return { time, amount: amount * amount * (3 - 2 * amount) };
  };

  return { duration, at };
}

/** Ширина по высоте и пропорции обложки; чётная — этого требуют видеокодеки */
const widthFor = (height: number, ratio: number) => Math.round((height * ratio) / 2) * 2;

/** Холст и функция, которая рисует на нём кадр: обложка — это столбик цветов, растянутый в ширину */
function createPainter(cover: Cover, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;

  const column = document.createElement('canvas');
  column.width = 1;
  column.height = height;
  const columnContext = column.getContext('2d')!;

  const paint = (time = 0, amount = 0) => {
    const pixels = coverPixels(cover, height, time, amount);
    columnContext.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, 1, height), 0, 0);
    context.drawImage(column, 0, 0, width, height);
  };

  return { canvas, paint };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сохранить картинку'))), type),
  );

/** Картинка PNG: обложка в покое */
export async function exportImage(cover: Cover, ratio: number): Promise<{ blob: Blob; extension: string }> {
  const { canvas, paint } = createPainter(cover, widthFor(IMAGE_HEIGHT, ratio), IMAGE_HEIGHT);
  paint();
  return { blob: await toBlob(canvas, 'image/png'), extension: 'png' };
}

/** Форматы видео по порядку: MP4 открывается везде, WebM — запасной вариант для браузеров без записи MP4 */
const VIDEO_TYPES = [
  { type: 'video/mp4;codecs=avc1.640028', extension: 'mp4' },
  { type: 'video/mp4', extension: 'mp4' },
  { type: 'video/webm;codecs=vp9', extension: 'webm' },
  { type: 'video/webm', extension: 'webm' },
];

/** Видео: записывается с холста в настоящем времени, поэтому занимает столько же секунд, сколько длится ролик */
export async function exportVideo(
  cover: Cover,
  ratio: number,
  onProgress: Progress,
): Promise<{ blob: Blob; extension: string }> {
  const format = VIDEO_TYPES.find((f) => window.MediaRecorder?.isTypeSupported(f.type));
  if (!format) throw new Error('Этот браузер не умеет записывать видео');

  const { canvas, paint } = createPainter(cover, widthFor(VIDEO_HEIGHT, ratio), VIDEO_HEIGHT);
  const { duration, at } = timeline(cover);
  paint();

  const recorder = new MediaRecorder(canvas.captureStream(VIDEO_FPS), {
    mimeType: format.type,
    videoBitsPerSecond: 10_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => chunks.push(event.data);
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('Запись видео прервалась'));
  });

  recorder.start();
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - started) / 1000;
      const { time, amount } = at(t);
      paint(time, amount);
      onProgress(Math.min(1, t / duration));
      if (t < duration) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;

  return { blob: new Blob(chunks, { type: format.type.split(';')[0] }), extension: format.extension };
}

/** GIF: кадры считаются без ожидания, быстрее настоящего времени. В кадре до 256 цветов — своих для каждого кадра */
export async function exportGif(cover: Cover, ratio: number, onProgress: Progress): Promise<{ blob: Blob; extension: string }> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const height = GIF_HEIGHT;
  const width = widthFor(height, ratio);
  const { duration, at } = timeline(cover);
  const frames = Math.round(duration * GIF_FPS);
  const gif = GIFEncoder();

  for (let frame = 0; frame < frames; frame++) {
    const { time, amount } = at(frame / GIF_FPS);
    // Цвета подбираются по одному столбику — во всех остальных они те же
    const column = coverPixels(cover, height, time, amount);
    const palette = quantize(column, 256);
    const rows = applyPalette(column, palette);
    const index = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) index.fill(rows[y], y * width, (y + 1) * width);
    gif.writeFrame(index, width, height, { palette, delay: 1000 / GIF_FPS });

    // Раз в несколько кадров даём странице перерисовать полоску готовности
    if (frame % 8 === 0) {
      onProgress(frame / frames);
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  gif.finish();
  return { blob: new Blob([gif.bytes() as Uint8Array<ArrayBuffer>], { type: 'image/gif' }), extension: 'gif' };
}

/** Отдать файл на скачивание */
export function download(blob: Blob, name: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}
