import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { impactContent } from '@/content/impact';
import './impact.css';

export default function Impact() {
  const { labels } = impactContent;
  const listRef = useReveal<HTMLOListElement>({ selector: '.impact-row' });
  return (
    <Section
      id={impactContent.id}
      variant="dark"
      className="impact"
      aria-labelledby="impact-title"
    >
      <div className="impact-layout">
        <header className="impact-intro">
          <Heading as="h2" id="impact-title" eyebrow={impactContent.eyebrow}>
            {impactContent.title}
          </Heading>
          <p className="impact-lead">{impactContent.description}</p>
          <p className="impact-note">{labels.note}</p>
        </header>
        <ol className="impact-list" ref={listRef} aria-label={labels.listLabel}>
          {impactContent.outcomes.map((outcome) => (
            <li className="impact-row" key={outcome.index}>
              <span className="impact-index" aria-hidden="true">
                {outcome.index}
              </span>
              <h3 className="impact-title">{outcome.title}</h3>
              <p className="impact-body">{outcome.body}</p>
              <div className="impact-mechanisms">
                <p className="impact-mechanisms-heading">
                  {labels.mechanismsHeading}
                </p>
                <ul>
                  {outcome.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <p className="impact-source">
                  {labels.sourcePrefix}
                  {outcome.source.pages.join(', ')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
