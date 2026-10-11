import { ArrowDownToLine } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { useReveal } from '@/lib/animations/useReveal';
import { finalCTAContent } from '@/content/final-cta';
import { sharedContent } from '@/content/shared';
import { siteConfig } from '@/content/config';
import { ContactForm } from './ContactForm';
import './final-cta.css';

const { labels } = finalCTAContent;

export default function FinalCTA() {
  const displayRef = useReveal<HTMLDivElement>({
    selector: '.final-cta-line, .final-cta-horizon',
  });
  const bodyRef = useReveal<HTMLDivElement>({
    selector: '.final-cta-reveal',
  });

  return (
    <Section
      id={finalCTAContent.id}
      variant="dark"
      className="final-cta"
      aria-labelledby="final-cta-title"
    >
      <div ref={displayRef} className="final-cta-frame">
        <span className="eyebrow">{finalCTAContent.eyebrow}</span>
        <h2 id="final-cta-title" className="final-cta-display">
          {finalCTAContent.displayLines.map((line, index) => (
            <span
              key={line}
              className={`final-cta-line final-cta-line-${index + 1}`}
            >
              {line}
              {index < finalCTAContent.displayLines.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>
        <div className="final-cta-horizon" aria-hidden="true">
          <span className="final-cta-sun" />
        </div>
      </div>

      <div ref={bodyRef} className="final-cta-grid">
        <div className="final-cta-aside">
          <p className="final-cta-lead final-cta-reveal">
            {finalCTAContent.description}
          </p>

          <div className="final-cta-brochure final-cta-reveal">
            <p className="final-cta-brochure-title">{labels.brochureTitle}</p>
            <p className="final-cta-brochure-body">{labels.brochureBody}</p>
            <Button
              variant="secondary"
              href={siteConfig.brochurePath}
              download
              className="final-cta-brochure-button"
            >
              <ArrowDownToLine
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {sharedContent.brochure}
              <span className="final-cta-brochure-meta">
                {labels.brochureMeta}
              </span>
            </Button>
          </div>

          <dl className="final-cta-credits final-cta-reveal">
            <div>
              <dt>{labels.companyLabel}</dt>
              <dd>
                {siteConfig.company}
                <br />
                {siteConfig.group}
              </dd>
            </div>
            <div>
              <dt>{labels.officesLabel}</dt>
              <dd>{siteConfig.locations.join(' · ')}</dd>
            </div>
            <div>
              <dt>{labels.websiteLabel}</dt>
              <dd>
                <a href={siteConfig.website} rel="noopener">
                  {siteConfig.websiteLabel}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div className="final-cta-form-wrap final-cta-reveal">
          <ContactForm />
        </div>
      </div>
    </Section>
  );
}
