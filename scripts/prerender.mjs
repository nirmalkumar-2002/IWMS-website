import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { routes, render } from '../.prerender/entry-server.js';
const template = await readFile('dist/index.html', 'utf8');
const escape = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
for (const route of routes) {
  const result = render(route);
  const html = template
    .replace(
      '<div id="root"></div>',
      () => `<div id="root">${result.html}</div>`,
    )
    .replace(
      /<title>.*?<\/title>/,
      () => `<title>${escape(result.title)}</title>`,
    )
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      () =>
        `<meta name="description" content="${escape(result.description)}" />`,
    )
    .replace(
      '</head>',
      () =>
        `${result.noindex ? '<meta name="robots" content="noindex, nofollow" />' : ''}</head>`,
    );
  const destination = resolve(
    'dist',
    route === '/404'
      ? '404.html'
      : `${route.slice(1)}${route === '/' ? '' : '/'}index.html`,
  );
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
  if (route !== '/' && route !== '/404')
    await writeFile(resolve('dist', `${route.slice(1)}.html`), html);
}
console.log(
  `Prerendered ${routes.length} marketing and preview pages into dist/.`,
);
