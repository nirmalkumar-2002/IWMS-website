import { Container } from '@/components/ui/Container';
import { navigation } from '@/content/navigation';
import { sharedContent } from '@/content/shared';
import { siteConfig } from '@/content/config';
import { modulesContent } from '@/content/modules';
export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-grid">
          <div>
            <a
              href="/#platform"
              className="footer-brand brand-logos brand-plate"
              aria-label={sharedContent.home}
            >
              <img
                loading="lazy"
                src="/brand/zigma.png"
                alt={sharedContent.zigmaAlt}
                width={126}
                height={142}
              />
              <img
                loading="lazy"
                src="/brand/blue-planet.png"
                alt={sharedContent.bluePlanetAlt}
                width={252}
                height={142}
              />
            </a>
            <p>{siteConfig.tagline}</p>
            <p>{siteConfig.group}</p>
            <p>{siteConfig.locations.join(' · ')}</p>
            <a href={siteConfig.website}>{siteConfig.websiteLabel}</a>
          </div>
          <nav aria-label={sharedContent.footerNavigation}>
            <h2>{sharedContent.quickLinks}</h2>
            <ul>
              {navigation.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
              <li>
                <a href="/#contact">{sharedContent.demo}</a>
              </li>
              <li>
                <a href={siteConfig.brochurePath} download>
                  {sharedContent.brochure}
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label={sharedContent.moduleLinks}>
            <h2>{sharedContent.moduleLinks}</h2>
            <ul>
              {modulesContent.modules.map((module) => (
                <li key={module.slug}>
                  <a href={`/modules/${module.slug}`}>{module.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>
            © {siteConfig.company} {siteConfig.group}.
          </p>
          <a href="/privacy">{sharedContent.privacy}</a>
        </div>
      </Container>
    </footer>
  );
}
