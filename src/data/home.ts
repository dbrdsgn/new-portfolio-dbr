/**
 * Порядок на главной берётся из документа «Порядок на главной.md» в корне проекта:
 * Денис пишет его сам. Читаются только строки списка «- ...» до первого заголовка «##».
 * В строке — имя папки кейса или статьи, или название целиком. Всё после « — » — пометка, не читается.
 * Неизвестная строка останавливает сборку и называет себя.
 *
 * Файл читается с диска при каждой отрисовке главной: в режиме разработки правка документа
 * видна после обновления страницы, без перезапуска
 */
import fs from 'node:fs';
import path from 'node:path';

const DOC = path.join(process.cwd(), 'Порядок на главной.md');

/** Строки списка: «- era — Упаковка для «Эра»» → «era» */
export function readHomeOrder(): string[] {
  if (!fs.existsSync(DOC)) throw new Error(`[главная] нет документа «Порядок на главной.md» в корне проекта`);
  return fs
    .readFileSync(DOC, 'utf8')
    .split(/^##\s/m)[0]
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1])
    .filter((item): item is string => Boolean(item))
    .map((item) => item.split(/\s+[—–]\s+/)[0].trim())
    .filter(Boolean);
}

/** Сравнение названий без разницы в кавычках, регистре и пробелах */
export const sameTitle = (a: string, b: string) => {
  const norm = (s: string) =>
    s
      .replace(/[«»"„“”]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  return norm(a) === norm(b);
};
