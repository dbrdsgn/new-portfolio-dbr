// Обложка заметки <note-cover seed="…">: по наведению полосы оживают,
// когда курсор уходит — быстро возвращаются на место.
// Сама картинка уже нарисована при сборке (см. components/NoteCover.astro),
// этот файл только двигает её. Если обложка стоит внутри ссылки-карточки,
// оживает от наведения на всю карточку.
import { createCover, coverStops, coverDefaults, type Cover, type CoverSettings } from '../lib/cover';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export class NoteCover extends HTMLElement {
  static observedAttributes = ['seed'];

  #settings: CoverSettings = coverDefaults;
  #cover: Cover | null = null;
  #zone: Element | null = null;
  #hovered = false;
  /** Сила оживания: 0 — исходная обложка, 1 — движение в полную силу */
  #amount = 0;
  #time = 0;
  #lastFrame = 0;
  #frame = 0;

  /** Свои настройки вместо настроек сайта — для страницы /cover-generator */
  set settings(value: CoverSettings) {
    this.#settings = value;
    this.#cover = null;
    this.#paint();
  }

  get settings(): CoverSettings {
    return this.#settings;
  }

  connectedCallback() {
    this.#zone = this.closest('a') ?? this;
    this.#zone.addEventListener('pointerenter', this.#onEnter);
    this.#zone.addEventListener('pointerleave', this.#onLeave);
  }

  disconnectedCallback() {
    this.#zone?.removeEventListener('pointerenter', this.#onEnter);
    this.#zone?.removeEventListener('pointerleave', this.#onLeave);
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    // При первом запуске картинка уже есть в HTML — пересчитаем её только при наведении
    const firstRun = oldValue === null && this.style.getPropertyValue('--cover-stops') !== '';
    this.#cover = null;
    if (!firstRun) this.#paint();
  }

  #onEnter = (event: Event) => {
    // На тач-экранах наведения нет: касание — это сразу переход по ссылке
    if ((event as PointerEvent).pointerType === 'touch' || reducedMotion.matches) return;
    this.#hovered = true;
    this.#start();
  };

  #onLeave = () => {
    this.#hovered = false;
  };

  #start() {
    if (this.#frame) return;
    this.#lastFrame = performance.now();
    this.#frame = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number) => {
    const delta = Math.min((now - this.#lastFrame) / 1000, 0.1);
    this.#lastFrame = now;
    this.#time += delta;
    // Обложка «просыпается» за wakeTime секунд и возвращается на место за returnTime
    this.#amount = this.#hovered
      ? Math.min(1, this.#amount + delta / Math.max(0.01, this.#settings.wakeTime))
      : Math.max(0, this.#amount - delta / Math.max(0.01, this.#settings.returnTime));

    this.#paint();

    this.#frame = this.#hovered || this.#amount > 0 ? requestAnimationFrame(this.#tick) : 0;
  };

  #paint() {
    this.#cover ??= createCover(this.getAttribute('seed') ?? '', this.#settings);
    // Плавный разгон и торможение
    const eased = this.#amount * this.#amount * (3 - 2 * this.#amount);
    this.style.setProperty('--cover-stops', coverStops(this.#cover, this.#time, eased));
  }
}

if (!customElements.get('note-cover')) customElements.define('note-cover', NoteCover);
