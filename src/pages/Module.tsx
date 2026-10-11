import { modulesContent } from '@/content/modules';
import { sharedContent } from '@/content/shared';
import { siteConfig } from '@/content/config';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { Button } from '@/components/ui/Button';
import NotFound from './NotFound';
import './module-page.css';

const pad = (value: number) => String(value).padStart(2, '0');

function Arrow({ direction = 'right' }: { direction?: 'left' | 'right' }) {
  return (
    <svg
      className={`module-page-arrow module-page-arrow-${direction}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export default function ModulePage({ slug }: { slug: string }) {
  const { modules, labels } = modulesContent;
  const index = modules.findIndex((entry) => entry.slug === slug);
  if (index === -1) return <NotFound />;
  const item = modules[index];
  const previous = modules[(index - 1 + modules.length) % modules.length];
  const next = modules[(index + 1) % modules.length];
  const total = modules.length;

  return (
    <Section id={slug} variant="dark" className="module-page">
      <nav className="module-page-crumbs" aria-label={labels.breadcrumb}>
        <a href={`/#${modulesContent.id}`} className="module-page-back">
          <Arrow direction="left" />
          <span>{labels.allModules}</span>
        </a>
      </nav>

      <header className="module-page-hero">
        <p className="module-page-meta">
          <span className="module-page-meta-index">
            {labels.module} {pad(index + 1)}{' '}
            <span className="module-page-meta-of">
              {labels.of} {pad(total)}
            </span>
          </span>
          <span className="module-page-meta-stage">{item.stage}</span>
        </p>
        <Heading as="h1" className="module-page-title">
          {item.title}
        </Heading>
        <div className="module-page-intro">
          <p className="module-page-lead">{item.lead}</p>
          <p className="module-page-summary">{item.summary}</p>
        </div>
      </header>

      <div className="module-page-body">
        <nav className="module-page-rail" aria-label={labels.indexLabel}>
          <ol>
            {modules.map((entry, entryIndex) => (
              <li key={entry.slug}>
                <a
                  href={`/modules/${entry.slug}`}
                  aria-current={entry.slug === slug ? 'page' : undefined}
                >
                  <span className="module-page-rail-num" aria-hidden="true">
                    {pad(entryIndex + 1)}
                  </span>
                  <span>{entry.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="module-page-features">
          <p className="module-page-features-label">
            <span>{labels.featuresHeading}</span>
            <span aria-hidden="true">
              {pad(item.features.length)} {labels.capabilityCount}
            </span>
          </p>
          <ol className="module-page-list">
            {item.features.map((feature, featureIndex) => (
              <li key={feature.title} className="module-page-feature">
                <span className="module-page-feature-num" aria-hidden="true">
                  {pad(index + 1)}.{featureIndex + 1}
                </span>
                <h2 className="module-page-feature-title">{feature.title}</h2>
                <p className="module-page-feature-body">{feature.body}</p>
              </li>
            ))}
          </ol>

          <aside className="module-page-cta">
            <p className="module-page-cta-title">{labels.ctaTitle}</p>
            <p className="module-page-cta-body">{labels.ctaBody}</p>
            <div className="module-page-cta-actions">
              <Button href="/#contact">{sharedContent.demo}</Button>
              <Button
                href={siteConfig.brochurePath}
                variant="secondary"
                download
              >
                {sharedContent.brochure}
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <nav className="module-page-pager" aria-label={labels.pager}>
        <a href={`/modules/${previous.slug}`} rel="prev">
          <span className="module-page-pager-label">
            <Arrow direction="left" />
            {labels.previous}
          </span>
          <span className="module-page-pager-title">{previous.title}</span>
        </a>
        <a
          href={`/modules/${next.slug}`}
          rel="next"
          className="module-page-pager-next"
        >
          <span className="module-page-pager-label">
            {labels.next}
            <Arrow />
          </span>
          <span className="module-page-pager-title">{next.title}</span>
        </a>
      </nav>
    </Section>
  );
}
