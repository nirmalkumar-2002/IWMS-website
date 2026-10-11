import { useId, useState } from 'react';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { modulesContent } from '@/content/modules';
import './modules.css';

const pad = (value: number) => String(value).padStart(2, '0');

export default function Modules() {
  const { labels, modules } = modulesContent;
  const [open, setOpen] = useState<number | null>(0);
  const [interacted, setInteracted] = useState(false);
  const baseId = useId();
  const listRef = useReveal<HTMLOListElement>({ selector: '.modules-row' });
  const capabilityTotal = modules.reduce(
    (sum, item) => sum + item.features.length,
    0,
  );

  return (
    <Section id={modulesContent.id} variant="light" className="modules">
      <header className="modules-head">
        <div className="modules-head-title">
          <Heading as="h2" eyebrow={modulesContent.eyebrow}>
            {modulesContent.title}
          </Heading>
        </div>
        <div className="modules-head-aside">
          <p className="modules-description">{modulesContent.description}</p>
          <dl className="modules-tally">
            <div>
              <dt>{labels.moduleCount}</dt>
              <dd>{pad(modules.length)}</dd>
            </div>
            <div>
              <dt>{labels.capabilityCount}</dt>
              <dd>{pad(capabilityTotal)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="modules-legend" aria-hidden="true">
        <span>{labels.module}</span>
        <span />
        <span>{labels.stage}</span>
        <span>{labels.capabilities}</span>
        <span />
      </div>
      <ol
        className="modules-index"
        ref={listRef}
        aria-label={labels.indexLabel}
        data-interacted={interacted ? 'true' : 'false'}
      >
        {modules.map((item, index) => {
          const isOpen = open === index;
          const triggerId = `${baseId}-trigger-${index}`;
          const panelId = `${baseId}-panel-${index}`;
          return (
            <li
              key={item.slug}
              className="modules-row"
              data-open={isOpen ? 'true' : 'false'}
            >
              <h3 className="modules-row-heading">
                <button
                  type="button"
                  id={triggerId}
                  className="modules-trigger"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => {
                    setInteracted(true);
                    setOpen(isOpen ? null : index);
                  }}
                >
                  <span className="modules-num" aria-hidden="true">
                    {pad(index + 1)}
                  </span>
                  <span className="modules-title">{item.title}</span>
                  <span className="modules-stage">{item.stage}</span>
                  <span className="modules-count" aria-hidden="true">
                    {pad(item.features.length)}
                  </span>
                  <span className="modules-icon" aria-hidden="true" />
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="modules-panel"
                hidden={!isOpen}
              >
                <div className="modules-panel-intro">
                  <p className="modules-lead">{item.lead}</p>
                  <p className="modules-summary">{item.summary}</p>
                  <a className="modules-link" href={`/modules/${item.slug}`}>
                    <span>{labels.viewModule}</span>
                    <svg
                      className="modules-link-arrow"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </svg>
                  </a>
                </div>
                <div className="modules-panel-features">
                  <p className="modules-features-label">
                    {labels.capabilities}
                  </p>
                  <ol className="modules-features">
                    {item.features.map((feature, featureIndex) => (
                      <li key={feature.title} className="modules-feature">
                        <span
                          className="modules-feature-num"
                          aria-hidden="true"
                        >
                          {pad(index + 1)}.{featureIndex + 1}
                        </span>
                        <h4 className="modules-feature-title">
                          {feature.title}
                        </h4>
                        <p className="modules-feature-body">{feature.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
