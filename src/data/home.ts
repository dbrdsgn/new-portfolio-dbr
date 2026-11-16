/**
 * Порядок проектов на главной: сверху вниз, как в списке.
 * Пишется адрес проекта — имя его папки в src/content/projects/.
 *
 * Проект, которого нет в списке, всё равно попадает на главную: в конец, по дате.
 * Сборка при этом пишет предупреждение [главная]. Ошибка в адресе останавливает сборку.
 *
 * На странице «Проекты» порядок свой — по дате, этот список на неё не влияет.
 */
export const homeOrder = [
  'btc',
  'tion-landing',
  'tion-logo',
  'exitdesign-hr',
  'exitdesign-site',
  'exitdesign-pres',
  'wb-car',
  'daewoo-package',
  'als-plitochka',
  'als-stroimprosto',
  'era',
  'rostelecom',
  'hse',
];
