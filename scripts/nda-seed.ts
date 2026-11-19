// Число для обложки кейса под NDA.
//
// Сид обложки — настоящее название кейса, но в репозиторий оно попасть не должно.
// Поэтому в index.md пишется не название, а число, которое из него считает генератор:
// обложка выходит та же, что на /cover-generator с настоящим названием.
//
// Запуск: node scripts/nda-seed.ts "Мерч для Студии Пример"
// Результат вписывается в index.md: coverHash: <число>

import { hashSeed } from '../src/lib/cover-hash.ts';

const title = process.argv.slice(2).join(' ');
if (!title.trim()) {
  console.error('Нужно название: node scripts/nda-seed.ts "Название кейса"');
  process.exit(1);
}
console.log(hashSeed(title));
