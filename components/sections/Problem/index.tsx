import { Section } from '@/components/ui/Section';
import { Heading } from '@/components/ui/Heading';
import { useReveal } from '@/lib/animations/useReveal';
import { problemContent } from '@/content/problem';
import './problem.css';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Problem() {
  const { id, eyebrow, title, description, items, labels } = problemContent;
  const ledgerRef = useReveal<HTMLOListElement>({ selector: '.problem-row' });
  const headRef = useReveal<HTMLDivElement>({ selector: '.problem-reveal' });

  return (
    <Section id={id} variant="light" className="problem">
      <div className="problem-head" ref={headRef}>
        <div className="problem-title problem-reveal">
          <Heading as="h2" eyebrow={eyebrow} className="problem-heading">
            {title}
          </Heading>
        </div>
        <p className="problem-description problem-reveal">{description}</p>
      </div>

      <div className="problem-ledger-head" aria-hidden="true">
        <span className="problem-ledger-head-gap">{labels.gapHeading}</span>
        <span className="problem-ledger-head-answer">
          {labels.answerHeading}
        </span>
      </div>

      <ol
        className="problem-ledger"
        aria-label={labels.listLabel}
        ref={ledgerRef}
      >
        {items.map((item, index) => (
          <li className="problem-row" key={item.title}>
            <span className="problem-num" aria-hidden="true">
              {pad(index + 1)}
            </span>
            <h3 className="problem-row-title">{item.title}</h3>
            <p className="problem-row-body">{item.body}</p>
            <div className="problem-answer">
              <span className="problem-answer-label">
                {labels.answerHeading}
              </span>
              <p className="problem-answer-text">{item.answer}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="problem-closing">
        <span className="problem-closing-kicker">{labels.closingKicker}</span>
        <span className="problem-closing-text">{labels.closing}</span>
      </p>
    </Section>
  );
}
