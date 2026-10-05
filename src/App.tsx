import { MotionProvider } from '@/lib/animations/MotionProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { sharedContent } from '@/content/shared';
import { sectionRegistry, type SectionName } from '@/lib/sections/registry';
import Home from './pages/Home';
import ModulePage from './pages/Module';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';
/** Native links keep navigation simple and work against prerendered static HTML. */
export default function App({ path }: { path: string }) {
  const route = path.replace(/\/$/, '') || '/';
  let page = <NotFound />;
  if (route === '/') page = <Home />;
  else if (route === '/privacy') page = <Privacy />;
  else if (/^\/modules\/[^/]+$/.test(route))
    page = <ModulePage slug={route.split('/')[2]} />;
  else if (/^\/dev\/[^/]+$/.test(route)) {
    const key = route.split('/')[2];
    if (Object.hasOwn(sectionRegistry, key)) {
      const Section = sectionRegistry[key as SectionName];
      page = <Section />;
    }
  }
  return (
    <MotionProvider>
      <a className="skip-link" href="#main-content">
        {sharedContent.skip}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {page}
      </main>
      <Footer />
    </MotionProvider>
  );
}
