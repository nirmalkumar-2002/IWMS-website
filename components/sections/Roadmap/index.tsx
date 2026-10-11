import type { CSSProperties } from 'react';
import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { roadmapContent } from '@/content/roadmap';
import './roadmap.css';

type SpanStyle = CSSProperties &
  Record<'--start' | '--end' | '--total', number>;

const pad = (n: number) => String(n).padStart(2, '0');
const span = (start: number, end: number): SpanStyle => ({
  '--start': start,
  '--end': end,
  '--total': roadmapContent.totalMonths,
});

export default function Roadmap() {
  const { id, eyebrow, title, description, items, labels, totalMonths } =
    roadmapContent;
  const headRef = useReveal<HTMLDivElement>({ selector: '.roadmap-reveal' });
  const listRef = useReveal<HTMLOListElement>({ selector: '.roadmap-phase' });
  const months = Array.from({ length: totalMonths + 1 }, (_, i) => i);

  return (
    <Section id={id} variant="dark" className="roadmap">
      <div className="roadmap-head" ref={headRef}>
        <div className="roadmap-reveal">
          <Heading as="h2" eyebrow={eyebrow} className="roadmap-heading">
            {title}
          </Heading>
        </div>
        <p className="roadmap-description roadmap-reveal">{description}</p>
      </div>

      <div className="roadmap-chart">
        <div className="roadmap-scale" aria-hidden="true">
          <span className="roadmap-scale-label">{labels.monthLabel}</span>
          <div className="roadmap-scale-track">
            {months.map((month) => (
              <span
                key={month}
                className="roadmap-tick"
                style={span(month, month)}
              >
                {month}
              </span>
            ))}
          </div>
        </div>

        <ol
          className="roadmap-phases"
          aria-label={labels.timelineLabel}
          ref={listRef}
        >
          {items.map((phase, index) => {
            return (
              <li
                className="roadmap-phase"
                key={phase.title}
                style={span(phase.start, phase.end)}
              >
                <div className="roadmap-phase-info">
                  <p className="roadmap-phase-meta">
                    <span className="roadmap-phase-num">
                      {labels.phaseLabel} {pad(index + 1)}
                    </span>
                    <span className="roadmap-phase-period">{phase.period}</span>
                  </p>
                  <h3 className="roadmap-phase-title">{phase.title}</h3>
                  <p className="roadmap-phase-body">{phase.body}</p>
                  <ul className="roadmap-phase-list">
                    {phase.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
                <div className="roadmap-track" aria-hidden="true">
                  <span className="roadmap-bar" />
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="roadmap-outcome">
        <p className="roadmap-outcome-kicker">{labels.outcomeKicker}</p>
        <p className="roadmap-outcome-text">{labels.outcome}</p>
        <p className="roadmap-outcome-note">{labels.outcomeNote}</p>
      </div>
    </Section>
  );
}
