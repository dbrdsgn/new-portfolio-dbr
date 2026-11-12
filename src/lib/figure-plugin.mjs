/**
 * Картинка, которая стоит в тексте отдельным абзацем, становится <figure>,
 * а её описание из ![описание](файл) — подписью под картинкой.
 * Нужно статьям: в кейсах картинок в тексте нет.
 * Плагин для Sätteri — обработчика Markdown в Astro.
 */
export const figurePlugin = {
  name: 'figure',
  element: {
    filter: ['p'],
    visit(node, ctx) {
      const kids = (node.children ?? []).filter((c) => !(c.type === 'text' && !c.value.trim()));
      if (kids.length !== 1 || kids[0].type !== 'element' || kids[0].tagName !== 'img') return;
      const img = kids[0];
      const caption = String(img.properties?.alt ?? '').trim();
      const children = [img];
      if (caption) {
        children.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: caption }],
        });
      }
      ctx.replaceNode(node, { type: 'element', tagName: 'figure', properties: {}, children });
    },
  },
};
