import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { audienceContent } from '@/content/audience';
import './audience.css';

const { labels } = audienceContent;

function pad(index: number) {
  return String(index + 1).padStart(2, '0');
}

export default function Audience() {
  const listRef = useReveal<HTMLOListElement>({ selector: '.audience-row' });

  return (
    <Section
      id={audienceContent.id}
      variant="light"
      className="audience"
      aria-labelledby="audience-title"
    >
      <header className="audience-head">
        <div className="audience-head-title">
          <Heading
            as="h2"
            id="audience-title"
            eyebrow={audienceContent.eyebrow}
            className="audience-title"
          >
            {audienceContent.title}
          </Heading>
        </div>
        <p className="audience-lead">{audienceContent.description}</p>
      </header>

      <ol ref={listRef} className="audience-list" aria-label={labels.listLabel}>
        {audienceContent.items.map((item, index) => (
          <li key={item.title} className="audience-row">
            <span className="audience-index" aria-hidden="true">
              {pad(index)}
            </span>
            <div className="audience-name">
              <h3 className="audience-row-title">{item.title}</h3>
              <p className="audience-role">{item.role}</p>
            </div>
            <div className="audience-detail">
              <p className="audience-body">{item.body}</p>
              <p className="sr-only">{labels.focusLabel}</p>
              <ul className="audience-focus">
                {item.focus.map((focus) => (
                  <li key={focus}>{focus}</li>
                ))}
              </ul>
              <p className="audience-source">
                {labels.sourcePrefix}
                {item.pages.join(', ')}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="audience-closing">
        <p className="audience-closing-label">
          {audienceContent.closing.label}
        </p>
        <p className="audience-closing-statement">
          {audienceContent.closing.statement}
        </p>
      </div>
    </Section>
  );
}
