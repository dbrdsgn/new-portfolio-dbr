/**
 * Сид обложки → число (FNV-1a). Из этого числа генератор строит обложку (src/lib/cover.ts).
 * Регистр и пробелы внутри важны, пробелы по краям — нет.
 *
 * Отдельный файл без зависимостей: его же запускает scripts/nda-seed.ts, чтобы посчитать
 * число для кейса под NDA, не записывая настоящее название в репозиторий.
 */
export function hashSeed(seed: string): number {
  const text = seed.normalize('NFC').trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
