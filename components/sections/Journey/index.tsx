import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { journeyContent, type JourneyStage } from '@/content/journey';
import './journey.css';

const pad = (n: number) => String(n).padStart(2, '0');
const { id, eyebrow, title, description, items, labels } = journeyContent;
const stageId = (stage: JourneyStage) => `${id}-${stage.slug}`;

function Stage({ stage, index }: { stage: JourneyStage; index: number }) {
  const ref = useReveal<HTMLDivElement>({ selector: '.journey-reveal' });
  const headingId = `${stageId(stage)}-title`;
  return (
    <li
      className="journey-stage"
      id={stageId(stage)}
      aria-labelledby={headingId}
    >
      <div className="journey-stage-marker">
        <span className="journey-stage-num" aria-hidden="true">
          {pad(index + 1)}
          <span className="journey-stage-total">/{pad(items.length)}</span>
        </span>
        <p className="journey-stage-place">
          <span className="sr-only">
            {labels.stageLabel} {index + 1}:{' '}
          </span>
          {stage.place}
        </p>
      </div>

      <div className="journey-stage-body" ref={ref}>
        <h3 className="journey-stage-title journey-reveal" id={headingId}>
          {stage.title}
        </h3>
        <p className="journey-stage-text journey-reveal">{stage.body}</p>

        {stage.flows && (
          <div className="journey-flows journey-reveal">
            <h4 className="journey-label">{labels.flowsHeading}</h4>
            <table className="journey-flow-table">
              <thead>
                <tr>
                  <th scope="col">{labels.flowStreamHeading}</th>
                  <th scope="col">{labels.flowTreatmentHeading}</th>
                </tr>
              </thead>
              <tbody>
                {stage.flows.map((flow) => (
                  <tr key={flow.stream}>
                    <th scope="row">{flow.stream}</th>
                    <td>{flow.treatment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="journey-records journey-reveal">
          <h4 className="journey-label">{labels.recordsHeading}</h4>
          <ul className="journey-record-list">
            {stage.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>

        {stage.note && (
          <aside className="journey-note journey-reveal">
            <h4 className="journey-note-title">{stage.note.title}</h4>
            <p>{stage.note.body}</p>
          </aside>
        )}
      </div>
    </li>
  );
}

export default function Journey() {
  const headRef = useReveal<HTMLDivElement>({ selector: '.journey-reveal' });
  const indexRef = useReveal<HTMLOListElement>({ selector: 'li' });

  return (
    <Section id={id} variant="dark" className="journey">
      <div className="journey-head" ref={headRef}>
        <div className="journey-title journey-reveal">
          <Heading as="h2" eyebrow={eyebrow} className="journey-heading">
            {title}
          </Heading>
        </div>
        <div className="journey-intro">
          <p className="journey-lede journey-reveal">{labels.lede}</p>
          <p className="journey-description journey-reveal">{description}</p>
        </div>
      </div>

      <nav className="journey-index" aria-label={labels.indexLabel}>
        <ol className="journey-index-list" ref={indexRef}>
          {items.map((stage, index) => (
            <li key={stage.slug}>
              <a href={`#${stageId(stage)}`} className="journey-index-link">
                <span className="journey-index-node" aria-hidden="true" />
                <span className="journey-index-num" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <span className="journey-index-place">{stage.place}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <ol className="journey-stages">
        {items.map((stage, index) => (
          <Stage key={stage.slug} stage={stage} index={index} />
        ))}
      </ol>
    </Section>
  );
}
