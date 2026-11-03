// Плашка «Задизайнил [всё ⌄]»: открытие списка и фильтр проектов.
// На главной выбранная категория фильтрует сетку и пишется в адрес (?category=branding),
// поэтому отфильтрованную главную можно отправить ссылкой.
// На других страницах пункт списка — обычная ссылка на главную с этой категорией.
// Список категорий собирается при сборке: в нём только те, где есть проекты.
const toggle = document.querySelector(".site-pill__toggle");
const list = document.querySelector(".site-pill__list");
const label = document.querySelector("[data-current-label]");

if (toggle && list && label) {
  const items = list.querySelectorAll("[data-category]");
  const cards = document.querySelectorAll(".project-card");
  const empty = document.querySelector(".projects__empty");
  const isGrid = cards.length > 0;
  const choose = toggle.closest("[data-choose]")?.dataset.choose ?? "";

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
  }

  function apply(category) {
    if (![...items].some((i) => i.dataset.category === category)) category = "all";

    let visible = 0;
    cards.forEach((card) => {
      const show = category === "all" || card.dataset.category === category;
      card.hidden = !show;
      if (show) visible++;
    });
    items.forEach((i) => {
      if (i.dataset.category === category) {
        i.setAttribute("aria-current", "page");
        label.textContent = i.textContent.trim();
      } else {
        i.removeAttribute("aria-current");
      }
    });
    toggle.setAttribute("aria-label", label.textContent + ". " + choose);
    // Переключатель языка ведёт на ту же категорию в другой версии
    document.querySelectorAll("[data-lang-link]").forEach((link) => {
      const target = new URL(link.href);
      if (category === "all") target.searchParams.delete("category");
      else target.searchParams.set("category", category);
      link.href = target;
    });
    if (empty) empty.hidden = visible > 0;
    return category;
  }

  // С мышью список открывается при наведении на «всё» и закрывается,
  // когда курсор уходит (с короткой задержкой, чтобы успеть дойти до списка).
  // На телефоне и с клавиатуры — по нажатию.
  const menu = toggle.parentElement;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)");
  let closeTimer;

  menu.addEventListener("mouseenter", () => {
    if (!canHover.matches) return;
    clearTimeout(closeTimer);
    setOpen(true);
  });

  menu.addEventListener("mouseleave", () => {
    if (!canHover.matches) return;
    closeTimer = setTimeout(() => setOpen(false), 250);
  });

  toggle.addEventListener("click", () => {
    // Мышью список уже открыт наведением — клик его не закрывает
    if (canHover.matches && toggle.matches(":hover")) setOpen(true);
    else setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  if (isGrid) {
    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const category = apply(item.dataset.category);
        setOpen(false);
        const url = new URL(location.href);
        if (category === "all") url.searchParams.delete("category");
        else url.searchParams.set("category", category);
        history.replaceState(null, "", url);
      });
    });

    apply(new URLSearchParams(location.search).get("category") || "all");
  }
}
