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
    'nav.info': 'Инфо',
    'nav.projects': 'Проекты',
    'filter.label': 'Фильтр проектов',
    'filter.lead': 'Задизайнил',
    'filter.all': 'всё',
    'filter.choose': 'Выбрать раздел',
    'projects.label': 'Проекты',
    'projects.empty': 'В этой категории пока нет проектов.',
    'project.next': 'Следующий проект',
    'project.soundOn': 'Включить звук',
    'project.soundOff': 'Выключить звук',
    'article.source': 'Впервые опубликовано на',
    'footer.offer': 'Открыт к разовым проектам и долгосрочному сотрудничеству.',
    'footer.social': 'Хочу участвовать в социальных проектах.',
    'footer.copyright': '© 2019–2026 Денис Сивухин',
  },
  en: {
    'site.name': 'Denis Sivukhin',
    'site.title': 'Denis Sivukhin — graphic designer',
    'site.description': 'Wayfinding, packaging, branding, web. Portfolio of graphic designer Denis Sivukhin.',
    'nav.label': 'Site sections',
    'nav.knowledge': 'Knowledge',
    'nav.info': 'Info',
    'nav.projects': 'Projects',
    'filter.label': 'Project filter',
    'filter.lead': 'Designed',
    'filter.all': 'everything',
    'filter.choose': 'Choose a section',
    'projects.label': 'Projects',
    'projects.empty': 'No projects in this category yet.',
    'project.next': 'Next project',
    'project.soundOn': 'Turn sound on',
    'project.soundOff': 'Turn sound off',
    'article.source': 'First published on',
    'footer.offer': 'Open to one-off projects and long-term collaboration.',
    'footer.social': 'I want to take part in social projects.',
    'footer.copyright': '© 2019–2026 Denis Sivukhin',
  },
} as const;

export type UiKey = keyof (typeof ui)['ru'];
