// Плашка «Денис Сивухин делает [всё ⌄]»: открытие списка и фильтр проектов.
// Выбранная категория пишется в адрес (?category=branding),
// поэтому отфильтрованную главную можно отправить ссылкой.
(function () {
  const toggle = document.querySelector(".site-pill__toggle");
  const list = document.querySelector(".site-pill__list");
  const label = document.querySelector("[data-current-label]");
  if (!toggle || !list || !label) return;

  const items = list.querySelectorAll("[data-category]");
  const cards = document.querySelectorAll(".project-card");
  const empty = document.querySelector(".projects__empty");

  // Категории без проектов не показываем в списке
  items.forEach((item) => {
    const cat = item.dataset.category;
    if (cat === "all") return;
    const has = [...cards].some((c) => c.dataset.category === cat);
    if (!has) item.closest("li").hidden = true;
  });

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
  }

  function apply(category) {
    const item = [...items].find((i) => i.dataset.category === category && !i.closest("li").hidden);
    if (!item) category = "all";

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
    toggle.setAttribute("aria-label", label.textContent + ". Выбрать раздел");
    if (empty) empty.hidden = visible > 0;
    return category;
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (e) => {
    if (!toggle.parentElement.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

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
})();
