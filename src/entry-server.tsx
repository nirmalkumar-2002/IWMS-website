import { renderToString } from 'react-dom/server';
import App from './App';
import { getPageMetadata } from './metadata';
export const routes = ['/', '/privacy', '/404'];
export function render(path: string) {
  return {
    html: renderToString(<App path={path} />),
    ...getPageMetadata(path),
  };
}
