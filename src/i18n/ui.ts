/** Тексты интерфейса на двух языках. Тексты кейсов — в src/content/ */
export const languages = { ru: 'Ru', en: 'En' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'ru';

export const ui = {
  ru: {
    'site.name': 'Денис Сивухин',
    'site.title': 'Денис Сивухин — графический дизайнер',
    'site.description': 'Навигация, упаковка, брендинг, веб. Портфолио графического дизайнера Дениса Сивухина.',
    'nav.label': 'Разделы сайта',
    'nav.knowledge': 'Знания',
    'nav.projects': 'Проекты',
    'contact.email': 'Почта',
    'contact.copy': 'Скопировать адрес почты',
    'contact.copied': 'Скопировано',
    'tags.label': 'Фильтр проектов',
    'tags.all': 'Все',
    'projects.label': 'Проекты',
    'project.next': 'Следующий проект',
    'project.soundOn': 'Включить звук',
    'project.soundOff': 'Выключить звук',
    'article.source': 'Впервые опубликовано на',
  },
  en: {
    'site.name': 'Denis Sivukhin',
    'site.title': 'Denis Sivukhin — graphic designer',
    'site.description': 'Wayfinding, packaging, branding, web. Portfolio of graphic designer Denis Sivukhin.',
    'nav.label': 'Site sections',
    'nav.knowledge': 'Knowledge',
    'nav.projects': 'Projects',
    'contact.email': 'Email',
    'contact.copy': 'Copy email address',
    'contact.copied': 'Copied',
    'tags.label': 'Project filter',
    'tags.all': 'All',
    'projects.label': 'Projects',
    'project.next': 'Next project',
    'project.soundOn': 'Turn sound on',
    'project.soundOff': 'Turn sound off',
    'article.source': 'First published on',
  },
} as const;

/** Адрес почты в шапке: по клику копируется */
export const email = 'sivukhindenis@mail.ru';

export type UiKey = keyof (typeof ui)['ru'];
