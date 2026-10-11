import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { financeContent } from '@/content/finance';
import './finance.css';

export default function Finance() {
  const { tariff, rollout, labels } = financeContent;
  const streamsRef = useReveal<HTMLOListElement>({
    selector: '.finance-stream',
  });
  return (
    <Section
      id={financeContent.id}
      variant="light"
      className="finance"
      aria-labelledby="finance-title"
    >
      <div className="finance-top">
        <header className="finance-intro">
          <Heading as="h2" id="finance-title" eyebrow={financeContent.eyebrow}>
            {financeContent.title}
          </Heading>
          <p className="finance-lead">{financeContent.description}</p>
        </header>

        <figure className="finance-tariff">
          <figcaption className="finance-tariff-label">
            {tariff.label}
          </figcaption>
          <p className="sr-only">{tariff.accessibleSummary}</p>
          <div className="finance-tariff-visual" aria-hidden="true">
            <p className="finance-tariff-figure">
              <span>{tariff.low}</span>
              <span className="finance-tariff-dash" />
              <span>{tariff.high}</span>
            </p>
            <div className="finance-scale">
              <span className="finance-scale-line" />
              <span className="finance-scale-end finance-scale-start">
                {tariff.lowLabel}
              </span>
              <span className="finance-scale-end finance-scale-finish">
                {tariff.highLabel}
              </span>
            </div>
            <p className="finance-tariff-period">{tariff.period}</p>
          </div>
        </figure>
      </div>

      <ol
        className="finance-streams"
        ref={streamsRef}
        aria-label={labels.streamsLabel}
      >
        {financeContent.streams.map((stream) => (
          <li className="finance-stream" key={stream.index}>
            <span className="finance-index" aria-hidden="true">
              {stream.index}
            </span>
            <h3 className="finance-stream-title">{stream.title}</h3>
            <p className="finance-stream-body">{stream.body}</p>
            {stream.flow && (
              <p className="finance-flow">
                <span className="sr-only">{stream.flow.accessibleSummary}</span>
                <span className="finance-flow-visual" aria-hidden="true">
                  <span>{stream.flow.from}</span>
                  <span className="finance-flow-arrow" />
                  <span>{stream.flow.to}</span>
                </span>
              </p>
            )}
            <div className="finance-support">
              <p className="finance-support-heading">{labels.supportHeading}</p>
              <p className="finance-support-body">{stream.support}</p>
              <p className="finance-source">
                {labels.sourcePrefix}
                {stream.source.pages.join(', ')}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="finance-rollout">
        <p className="finance-rollout-label">{rollout.label}</p>
        <p className="finance-rollout-phase">
          <span>{rollout.phase}</span>
          <span className="finance-rollout-window">{rollout.window}</span>
        </p>
        <p className="finance-rollout-body">{rollout.body}</p>
      </div>
      <p className="finance-note">{labels.note}</p>
    </Section>
  );
}
