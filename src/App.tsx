import { sharedContent } from '@/content/shared';
import Home from './pages/Home';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';
/** Native links keep navigation simple and work against prerendered static HTML. */
export default function App({ path }: { path: string }) {
  const route = path.replace(/\/$/, '') || '/';
  let page = <NotFound />;
  if (route === '/') page = <Home />;
  else if (route === '/privacy') page = <Privacy />;
  return (
    <>
      <a className="skip-link" href="#main-content">
        {sharedContent.skip}
      </a>
      <main id="main-content" tabIndex={-1}>
        {page}
      </main>
    </>
  );
}
