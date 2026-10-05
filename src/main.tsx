import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import './styles/globals.css';
import App from './App';
import { getPageMetadata } from './metadata';
const path = window.location.pathname;
const meta = getPageMetadata(path);
document.title = meta.title;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute('content', meta.description);
const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
);
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
