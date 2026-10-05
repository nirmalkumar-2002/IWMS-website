import { renderToString } from 'react-dom/server';
import App from './App';
import { getPageMetadata } from './metadata';
import { sectionRegistry } from '@/lib/sections/registry';
import { modulesContent } from '@/content/modules';
export const routes = [
  '/',
  '/privacy',
  '/404',
  ...modulesContent.modules.map((item) => `/modules/${item.slug}`),
  ...Object.keys(sectionRegistry).map((key) => `/dev/${key}`),
];
export function render(path: string) {
  return {
    html: renderToString(<App path={path} />),
    ...getPageMetadata(path),
  };
}
